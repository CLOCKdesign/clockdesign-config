export class MessageParser {
    constructor() {
        this.STX = 0x02; // Start byte
        this.ETX = 0x03; // End byte
        this.MODE_INDEX = 1; // Index of the mode byte in the message
        this.size = 20;
        this.buffer = new Array(this.size).fill(0);
        this.message = null;
        this.msgLen = 7;
        this.posInput = 0;
        this.posCheck = 0;
    }

    parseByte(byte) {
        this.posInput = (this.posInput + 1) % this.size;
        this.buffer[this.posInput % this.size] = byte;

        if (this.posInput != this.posCheck) {
            this.posCheck = (this.posCheck + 1) % this.size;
            let posStart = (this.posCheck + this.size - (this.msgLen - 1)) % this.size;
            if (this.buffer[posStart] == this.STX && this.buffer[this.posCheck] == this.ETX) {
                let mode = this.buffer[(posStart + 1) % this.size]
                let payload = [];
                for (let i = 0; i < 4; i++) {
                    payload[i] = this.buffer[(posStart + 2 + i) % this.size];
                }
                return {
                    mode: mode,
                    payload: payload
                };
            }
        }
        return null
    }
}
