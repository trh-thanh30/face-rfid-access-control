#!/usr/bin/env sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="${TMPDIR:-/tmp}/access-control-firmware-tests"
mkdir -p "$output_dir"

g++ -std=c++17 -Wall -Wextra -Werror \
  -I "$root_dir/lib/device_core" \
  "$root_dir/lib/device_core/device_state_machine.cpp" \
  "$root_dir/test/native/test_state_machine.cpp" \
  -o "$output_dir/state-machine-tests"

"$output_dir/state-machine-tests"
