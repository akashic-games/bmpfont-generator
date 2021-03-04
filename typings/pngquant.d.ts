declare module "pngquant" {
	export class quant {
		constructor(options: any[]);
		on(name: string, cb: (data: any) => void): quant;
	}
}