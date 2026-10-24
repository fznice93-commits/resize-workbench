import Foundation
import ImageIO
import Vision

struct OCRItem: Codable {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

guard CommandLine.arguments.count == 2 else { exit(64) }
let path = CommandLine.arguments[1]
let imageURL = URL(fileURLWithPath: path) as CFURL
guard let imageSource = CGImageSourceCreateWithURL(imageURL, nil) else { exit(65) }
guard let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else { exit(66) }

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.012
request.usesCPUOnly = true

do {
    try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
    let items = (request.results ?? []).compactMap { observation -> OCRItem? in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return OCRItem(
            text: candidate.string,
            confidence: candidate.confidence,
            x: box.origin.x,
            y: box.origin.y,
            width: box.size.width,
            height: box.size.height
        )
    }
    let data = try JSONEncoder().encode(items)
    FileHandle.standardOutput.write(data)
} catch {
    let nsError = error as NSError
    FileHandle.standardError.write(Data("\(nsError.domain):\(nsError.code):\(nsError.userInfo)".utf8))
    exit(67)
}
