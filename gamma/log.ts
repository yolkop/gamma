class Logger {
    #process(data: any[]) {
        const finalOutput: string[] = [];

        for (const item of data) {
            if (typeof item === 'object') finalOutput.push(JSON.stringify(item, null, 2));
            else finalOutput.push(item);
        }

        return finalOutput.join(' ');
    }

    red(...args: any[]) {
        console.log(`\u001b[31m${this.#process(args)}\u001b[0m`);
    }

    green(...args: any[]) {
        console.log(`\u001b[32m${this.#process(args)}\u001b[0m`);
    }

    yellow(...args: any[]) {
        console.log(`\u001b[33m${this.#process(args)}\u001b[0m`);
    }

    blue(...args: any[]) {
        console.log(`\u001b[34m${this.#process(args)}\u001b[0m`);
    }

    magenta(...args: any[]) {
        console.log(`\u001b[35m${this.#process(args)}\u001b[0m`);
    }

    cyan(...args: any[]) {
        console.log(`\u001b[36m${this.#process(args)}\u001b[0m`);
    }

    orange(...args: any[]) {
        console.log(`\u001b[38;5;214m${this.#process(args)}\u001b[0m`);
    }
}

const logger = new Logger();
export default logger;