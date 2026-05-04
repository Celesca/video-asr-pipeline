from pathlib import Path
import argparse
import os
import subprocess
import tempfile

import imageio_ffmpeg
from openai import OpenAI
from dotenv import load_dotenv


def extract_audio_to_mp3(input_video: str, output_mp3: str | None = None) -> str:
	input_path = Path(input_video)
	if not input_path.exists():
		raise FileNotFoundError(f"Input file not found: {input_path}")

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


def transcribe_audio_file(audio_path: str, api_key: str) -> str:
	client = OpenAI(api_key=api_key)

	with open(audio_path, "rb") as audio_file:
		transcription = client.audio.transcriptions.create(
			model="gpt-4o-transcribe",
			language="th",
			file=audio_file,
		)

	return transcription.text


def analyze_transcript(transcript_text: str, api_key: str) -> str:
	client = OpenAI(api_key=api_key)
	
	prompt = """
	You are an expert technical reviewer. Your job is to read the following transcript of a video 
	and determine if any of the information is outdated, especially regarding programming languages like Java.
	Please provide a concise summary indicating if the content is still relevant, or if it requires an update.
	"""
	
	response = client.chat.completions.create(
		model="gpt-4o",
		messages=[
			{"role": "system", "content": prompt},
			{"role": "user", "content": transcript_text}
		]
	)
	
	return response.choices[0].message.content


def load_video_paths(video_paths: list[str] | None, video_list_file: str | None) -> list[str]:
	paths: list[str] = []

	if video_list_file:
		with open(video_list_file, "r", encoding="utf-8") as handle:
			for line in handle:
				item = line.strip()
				if item and not item.startswith("#"):
					paths.append(item)

	if video_paths:
		paths.extend(video_paths)

	if not paths:
		raise ValueError("Provide at least one video path or a video list file")

	return paths


def process_video(video_path: str, api_key: str, output_dir: str | None = None) -> Path:
	video_file = Path(video_path)
	if not video_file.exists():
		raise FileNotFoundError(f"Input file not found: {video_file}")

	output_base = Path(output_dir) if output_dir else video_file.parent
	output_base.mkdir(parents=True, exist_ok=True)

	transcript_path = output_base / f"{video_file.stem}.txt"

	with tempfile.TemporaryDirectory() as temp_dir:
		audio_path = Path(temp_dir) / f"{video_file.stem}.mp3"
		extract_audio_to_mp3(str(video_file), str(audio_path))
		transcript_text = transcribe_audio_file(str(audio_path), api_key)

	transcript_path.write_text(transcript_text, encoding="utf-8")
	return transcript_path


def main() -> None:
	parser = argparse.ArgumentParser(description="Extract audio from video files and transcribe them with OpenAI")
	parser.add_argument("video_paths", nargs="*", help="Paths to input video files")
	parser.add_argument("-l", "--video-list", dest="video_list_file", help="Text file containing one video path per line")
	parser.add_argument("-o", "--output-dir", dest="output_dir", help="Directory where transcripts are saved")
	args = parser.parse_args()

	load_dotenv()
	api_key = os.getenv("OPENAI_API_KEY")
	if not api_key:
		raise ValueError("Set OPENAI_API_KEY in your .env file")

	video_paths = load_video_paths(args.video_paths, args.video_list_file)

	for video_path in video_paths:
		transcript_path = process_video(video_path, api_key, args.output_dir)
		print(f"Saved transcript: {transcript_path}")


if __name__ == "__main__":
	main()
