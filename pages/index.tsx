import { useState } from "react";

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tone, setTone] = useState("trainer");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setPreview(URL.createObjectURL(uploadedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Please upload an image.");
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("tone", tone);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.result);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Physique-GPT</h1>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Upload a Gym Selfie:</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Choose Tone:</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="trainer">Professional Trainer</option>
            <option value="funny">Funny</option>
            <option value="brutal">Brutal</option>
            <option value="flirty">Flirty</option>
            <option value="dad">Dad</option>
          </select>
        </div>

        {preview && (
          <div className="mb-4">
            <img src={preview} alt="Preview" className="rounded-xl max-w-xs mx-auto" />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Analyzing..." : "Submit"}
        </button>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      </form>

      {result && (
        <div className="mt-6 bg-white p-4 rounded shadow-md">
          <h3 className="font-semibold mb-2">AI Response:</h3>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
