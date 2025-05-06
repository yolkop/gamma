RED_LOG() {
    echo -e "\033[31m$1\033[0m"
}

ORANGE_LOG() {
    echo -e "\033[38;5;214m$1\033[0m"
}

YELLOW_LOG() {
    echo -e "\033[93m$1\033[0m"
}

GREEN_LOG() {
    echo -e "\033[92m$1\033[0m"
}

BLUE_LOG() {
    echo -e "\033[94m$1\033[0m"
}

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

if [ ! -d "$SCRIPT_DIR/.cnf" ]; then
    OLD_DIR=$(pwd)

    cd "$SCRIPT_DIR"

    BLUE_LOG "gamma has not yet been run. setting up the environment..."

    mkdir .cnf

    if ! command -v node &> /dev/null; then
        curl -o- https://fnm.vercel.app/install | bash
        fnm install 23
    fi

    if ! command -v bun &> /dev/null; then
        curl -fsSL https://bun.sh/install | bash
    fi

    bun install --production

    clear

    BLUE_LOG "gamma has not yet been run. setting up the environment..."
    GREEN_LOG "node & bun (deps) have been installed"

    BLUE_LOG "time to setup .env..."

    bun ./cli/init.ts

    if [ $? -eq 0 ]; then
        GREEN_LOG ".env has been set up"
    else
        RED_LOG "failed to set up .env"
        exit 1
    fi

    YELLOW_LOG "that means we're done with setup! running the main CLIkit..."

    sleep 5

    cd "$OLD_DIR"
fi

clear

ORANGE_LOG "\n\n"
ORANGE_LOG "          ▄████  ▄▄▄       ███▄ ▄███▓ ███▄ ▄███▓ ▄▄▄      "
ORANGE_LOG "         ██▒ ▀█▒▒████▄    ▓██▒▀█▀ ██▒▓██▒▀█▀ ██▒▒████▄    "
ORANGE_LOG "        ▒██░▄▄▄░▒██  ▀█▄  ▓██    ▓██░▓██    ▓██░▒██  ▀█▄  "
ORANGE_LOG "        ░▓█  ██▓░██▄▄▄▄██ ▒██    ▒██ ▒██    ▒██ ░██▄▄▄▄██ "
ORANGE_LOG "        ░▒▓███▀▒ ▓█   ▓██▒▒██▒   ░██▒▒██▒   ░██▒ ▓█   ▓██▒"
ORANGE_LOG "         ░▒   ▒  ▒▒   ▓▒█░░ ▒░   ░  ░░ ▒░   ░  ░ ▒▒   ▓▒█░"
ORANGE_LOG "          ░   ░   ▒   ▒▒ ░░  ░      ░░  ░      ░  ▒   ▒▒ ░"
ORANGE_LOG "\n                        $ gamma | gcli"
ORANGE_LOG "\n"

bun --env-file="$SCRIPT_DIR/.env" "$SCRIPT_DIR/cli/gcli.ts"