SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
OLD_DIR=$(pwd)

cd "$SCRIPT_DIR"

npx tsx --env-file="$SCRIPT_DIR/.env" --disable-warning=ExperimentalWarning "$SCRIPT_DIR/gamma/main.ts" "$@"

cd "$OLD_DIR"