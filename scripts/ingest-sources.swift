import AppKit
import CryptoKit
import Foundation
import Vision

struct ImageInspection: Codable {
  let file: String
  let digest: String
  let width: Int
  let height: Int
  let status: String
  let text: String
  let confidence: Double
  let error: String?
}

func sha256(_ data: Data) -> String {
  SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}

guard CommandLine.arguments.count == 3 else {
  FileHandle.standardError.write(Data("usage: ingest-sources.swift MEDIA_DIR OUTPUT_JSON\n".utf8))
  exit(2)
}

let mediaDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let manager = FileManager.default
let supported = Set(["png", "jpg", "jpeg", "gif", "tif", "tiff", "bmp", "heic"])
let files = try manager.contentsOfDirectory(
  at: mediaDirectory,
  includingPropertiesForKeys: nil,
  options: [.skipsHiddenFiles]
).filter { supported.contains($0.pathExtension.lowercased()) }.sorted { $0.lastPathComponent < $1.lastPathComponent }

let inspections = files.map { file -> ImageInspection in
  do {
    let data = try Data(contentsOf: file)
    guard let image = NSImage(data: data),
          let representation = image.representations.first else {
      return ImageInspection(
        file: file.lastPathComponent,
        digest: sha256(data),
        width: 0,
        height: 0,
        status: "unexamined",
        text: "",
        confidence: 0,
        error: "unsupported-image"
      )
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(data: data)
    try handler.perform([request])
    let candidates = (request.results ?? []).compactMap { observation in
      observation.topCandidates(1).first
    }
    let text = candidates.map(\.string).joined(separator: "\n")
    let confidence = candidates.isEmpty
      ? 1
      : candidates.map { Double($0.confidence) }.reduce(0, +) / Double(candidates.count)
    return ImageInspection(
      file: file.lastPathComponent,
      digest: sha256(data),
      width: representation.pixelsWide,
      height: representation.pixelsHigh,
      status: "ocr-inspected",
      text: text,
      confidence: confidence,
      error: nil
    )
  } catch {
    let data = (try? Data(contentsOf: file)) ?? Data()
    return ImageInspection(
      file: file.lastPathComponent,
      digest: sha256(data),
      width: 0,
      height: 0,
      status: "unexamined",
      text: "",
      confidence: 0,
      error: String(describing: error)
    )
  }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
try encoder.encode(inspections).write(to: output, options: .atomic)

if inspections.contains(where: { $0.status == "unexamined" }) {
  exit(1)
}
