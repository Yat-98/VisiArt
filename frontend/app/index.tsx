import { useState, ChangeEvent } from 'react';

type ImageResult = {
  images: string[];
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultImages, setResultImages] = useState<string[]>([]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setImage(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append('image', file);

      setLoading(true);
      const response = await fetch('/api/cartoonize', {
        method: 'POST',
        body: formData,
      });

      const data: ImageResult = await response.json();
      setResultImages(data.images); // Assume the backend sends back URLs to 5 images
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="text-center p-6">
        <h1 className="text-4xl font-bold mb-4">Cartoonize Your Image</h1>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="mb-4"
        />
        {image && (
          <div className="mb-4">
            <img src={image} alt="Uploaded Image" className="max-w-xs mx-auto" />
          </div>
        )}
        {loading ? (
          <p>Processing your image...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {resultImages.map((img, index) => (
              <div key={index} className="w-full">
                <img src={img} alt={`Result ${index + 1}`} className="w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
