import { useState } from "react";

const API_URL = "http://localhost:8000";

function PaletteGenerator() {
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [category, setCategory] = useState("uiux");
  const [palette, setPalette] = useState<string[]>([]);

  // Step 1: image uploaded -> fill the swatch row
  async function handleImageUpload(file: File) {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch(`${API_URL}/extract-colors`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setExtractedColors(data.colors); // ["#278178", "#408F87", ...]
  }

  // Step 2: user clicks a swatch -> generate the full palette
  async function handleColorPick(hexColor: string) {
    const form = new FormData();
    form.append("base_color", hexColor);
    form.append("category", category);

    const res = await fetch(`${API_URL}/generate-palette`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setPalette(data.palette); // array of 6 hex colors
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e.target.files?.[0] as File)}
      />

      <div className="swatch-row">
        {extractedColors.map((hex) => (
          <button key={hex} style={{ backgroundColor: hex }} onClick={() => handleColorPick(hex)} />
        ))}
      </div>

      <div className="palette-row">
        {palette.map((hex) => (
          <div key={hex} style={{ backgroundColor: hex }}>
            {hex}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PaletteGenerator;
