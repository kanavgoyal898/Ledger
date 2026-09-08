export { cn } from "cn";

export function stringToColor(value: string): string {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) | 0;
	}

	const hue = Math.abs(hash) % 360;
	return `hsl(${hue} 70% 45%)`;
}
