#!/bin/bash

TARGET_SCRIPT_1="$PWD/start.sh"
INSTALL_PATH_1="/usr/local/bin/gamma"

echo "#!/bin/bash" > tmp_1
echo "\"$TARGET_SCRIPT_1\"" >> tmp_1

chmod +x tmp_1

sudo mv tmp_1 "$INSTALL_PATH_1"

TARGET_SCRIPT_2="$PWD/cli.sh"
INSTALL_PATH_2="/usr/local/bin/gcli"

echo "#!/bin/bash" > tmp_2
echo "\"$TARGET_SCRIPT_2\"" >> tmp_2

chmod +x tmp_2

sudo mv tmp_2 "$INSTALL_PATH_2"

echo -e "\033[32mGamma was installed to /usr/local/bin\033[0m"
echo -e "\033[1;32mRun gamma to run the main program\033[0m"
echo -e "\033[1;32mRun gcli to run the CLI kit\033[0m"