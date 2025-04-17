import PngQuant from "pngquant";
import * as canvas from "canvas";
import * as fs from "fs";

export  function outputBitmapFont(output: string, cvs: canvas.Canvas, quality?: number) {
    return new Promise<void>((resolve, reject) => {
        if (quality) return compressPNG(output, cvs, quality);

        cvs.toBuffer((error: any, result: Buffer) => {
            if (error) reject(error);
            fs.writeFileSync(output, result);
            resolve();
        });
    });
}

function compressPNG(output: string, cvs: canvas.Canvas, quality: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const pngQuanter: any = new PngQuant([`--quality=${quality}`, "256"]);
        const chunks: Buffer[] = [];
        pngQuanter
            .on("data", (chunk: Buffer) => {
                chunks.push(chunk);
            })
            .on("end", () => {
                fs.writeFileSync(output, Buffer.concat(chunks));
                resolve();
            })
            .on("error", () => reject("error at pngquant"));
        cvs.createPNGStream().pipe(pngQuanter);
    });
}
