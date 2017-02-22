declare module "pngquant" {
	class quant {
		constructor(options: any[]);
		on(name: string, cb: (data: any) => void): quant;
	}
	export = quant;
}