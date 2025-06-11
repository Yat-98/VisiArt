'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('Cartoon');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStyle(event.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('style', selectedStyle);

    try {
      const res = await fetch('http://127.0.0.1:8000/stylize/', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to stylize image');

      const blob = await res.blob();
      setOutputUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      alert('Something went wrong while uploading.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden">
      {/* Decorative Top Background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-[#b0d5ff] rounded-b-[40%] z-0"></div>
      

      {/* Header */}
      <header className="relative z-10 flex flex-col items-center pt-8 space-y-2">
        <Image src="/artify.png" alt="ArtifyME" width={500} height={300} />
        <p className="text-lg md:text-xl font-semibold text-gray-700 font-alatsi">
          Turn Your Photos into Fun - Cartoonize with a Click
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-12 space-y-12">
        <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl p-12 shadow-2xl">
          {/* Upload Area */}
          <label htmlFor="file-upload" className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-16 mb-8 cursor-pointer bg-[#b0d5ff]/20 hover:bg-[#b0d5ff]/30 transition">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected Preview" className="w-full h-80 object-cover rounded-lg" />
            ) : (
              <>
                <div className="mb-4 text-[#7395f6]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Choose Image</h2>
              </>
            )}
            <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>

          {/* Style Dropdown */}
          <select
            value={selectedStyle}
            onChange={handleStyleChange}
            className="w-full mb-8 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-gray-700 text-lg"
          >
            <option>Cartoon</option>
            <option>Black & White</option>
            <option>Oil Painting</option>
            <option>Pencil Sketch</option>
            <option>Stylized</option>
            <option>Sepia</option>
          </select>

          {/* Upload Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-[#b0d5ff] hover:bg-[#7395f6] transition-colors text-black font-bold py-4 px-16 rounded-full text-xl shadow-lg disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Artify Image 🎨'}
            </button>
          </div>
        </div>

        {/* Output Image */}
        {outputUrl && (
          <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl p-12 shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-semibold text-center text-blue-800 mb-6">Your Artified Image 🎨</h2>
            <img src={outputUrl} alt="Styled Output" className="rounded-xl shadow-2xl w-full mb-6" />
            <a href={outputUrl} download="artified_image.png" className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition text-lg">
              Download Image ⬇️
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-blue-600 py-6">
        <p>© 2025 ArtifyME. All rights reserved.</p>
        <p>Made with ❤️</p>
      </footer>

      {/* Decorative Bottom Elements */}
      <div className="absolute bottom-0 left-0 z-0">
        <Image src="/left.jpg" alt="Decorative Left" width={180} height={180} />
      </div>
      <div className="absolute bottom-0 right-0 z-0">
        <Image src="/right.jpg" alt="Decorative Right" width={180} height={180} />
      </div>
    </div>
  );
}
