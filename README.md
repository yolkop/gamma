<div align='center'>
    <h1>Gamma</h1>
    <h3>a shell shockers chick'n winner automator</h3>
</div>

<br>

<i>gamma is one of the many chick'n winner automators worked on overtime, and it was very good for its time. however, it would not run smoothly today. to make gamma work, at a minimum, you would have to recreate the web interface and then update yolkbot.</i>

<br>

## features

- interactive CLI (including setup!)
- web UI
- ingame verification
- email verification
- advanced configuration
- proper threading
- systemd support
- db backups
- ratelimit management
- proxy-first design

<br>

## setup

1. `git clone https://github.com/yolkop/Gamma && cd Gamma`
2. `chmod +x install.sh`
3. `./install.sh`
4. `gcli`

the CLI tool will guide you on setting up gamma! after you're done, you can run `gcli` to run gamma's CLI from any folder and any terminal. it'll *just work.*

the `gamma` command runs gamma's main process (cli > run) without the CLI itself. this is what you can put in systemd to make gamma run 24/7 in the background.

<br><br>
<h5 align='center'>made with ❤️</h5>