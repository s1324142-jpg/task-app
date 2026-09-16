#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

echo "Generating the Android project..."
npx expo prebuild --platform android --clean

echo "Building the installable APK..."
(
  cd android
  ./gradlew :app:assembleRelease
)

apk_path="$project_dir/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$apk_path" ]]; then
  echo "APK was not created at the expected path: $apk_path" >&2
  exit 1
fi

echo "APK created: $apk_path"
