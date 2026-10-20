// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FeriaCapacitorFilePreview",
    platforms: [.iOS(.v15)],
    products: [.library(name: "FeriaCapacitorFilePreview", targets: ["FeriaFilePreviewPlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3")
    ],
    targets: [
        .target(
            name: "FeriaFilePreviewPlugin",
            dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")],
            path: "ios/Sources/FeriaFilePreviewPlugin",
            linkerSettings: [.linkedFramework("QuickLook")]
        )
    ]
)
