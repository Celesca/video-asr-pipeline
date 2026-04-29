from pathlib import Path
import argparse
import subprocess
import imageio_ffmpeg


def extract_audio_to_mp3(input_mp4: str, output_mp3: str | None = None) -> str:
	input_path = Path(input_mp4)
	if not input_path.exists():
		raise FileNotFoundError(f"Input file not found: {input_path}")

	if input_path.suffix.lower() not in [".mp4", ".m4v"]:
		raise ValueError("Input file must be an .mp4 or .m4v file")

	out_path = Path(output_mp3) if output_mp3 else input_path.with_suffix(".mp3")

	# Use ffmpeg to extract audio
	ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
	cmd = [
		ffmpeg_exe,
		"-i", str(input_path),
		"-q:a", "0",
		"-map", "a",
		"-y",
		str(out_path)
	]
	
	subprocess.run(cmd, check=True, capture_output=False)

	return str(out_path)


def main() -> None:
	parser = argparse.ArgumentParser(description="Extract audio from MP4 and save as MP3")
	parser.add_argument("input_mp4", help="Path to input .mp4 file")
	parser.add_argument("-o", "--output", dest="output_mp3", help="Path to output .mp3 file")
	args = parser.parse_args()

	output_file = extract_audio_to_mp3(args.input_mp4, args.output_mp3)
	print(f"Saved MP3: {output_file}")


if __name__ == "__main__":
	main()
