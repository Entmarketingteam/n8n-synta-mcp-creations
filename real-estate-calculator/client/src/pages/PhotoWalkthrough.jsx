import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard';

export default function PhotoWalkthrough() {
  const { id } = useParams();
  const [photos, setPhotos] = useState([]);
  const [checklist, setChecklist] = useState({ rooms: [] });
  const [selectedRoom, setSelectedRoom] = useState('exterior_front');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPhotos();
    loadChecklist();
  }, [id]);

  const loadPhotos = async () => {
    const res = await fetch(`/api/photos/${id}`);
    setPhotos(await res.json());
  };

  const loadChecklist = async () => {
    const res = await fetch('/api/templates/walkthrough-checklist');
    const data = await res.json();
    setChecklist(data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('roomId', selectedRoom);
    try {
      await fetch(`/api/photos/${id}`, { method: 'POST', body: formData });
      loadPhotos();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAnalyze = async (photoId) => {
    await fetch(`/api/photos/${id}/photos/${photoId}/analyze`, { method: 'POST' });
    loadPhotos();
  };

  const handleDelete = async (photoId) => {
    await fetch(`/api/photos/${id}/photos/${photoId}`, { method: 'DELETE' });
    loadPhotos();
  };

  const roomPhotos = photos.filter(p => p.room_id === selectedRoom);
  const currentRoom = checklist.rooms?.find(r => r.id === selectedRoom);

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/deals/${id}`} className="text-blue-600 text-sm">&larr; Back to Deal</Link>
        <h1 className="text-2xl font-bold">Property Walkthrough</h1>
        <p className="text-sm text-gray-500">Upload photos room-by-room and use AI to detect potential issues.</p>
      </div>

      {/* Room Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {checklist.rooms?.map(room => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room.id)}
            className={`px-3 py-2 rounded-md text-sm whitespace-nowrap ${
              selectedRoom === room.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {room.label}
            {photos.filter(p => p.room_id === room.id).length > 0 && (
              <span className="ml-1 text-xs">({photos.filter(p => p.room_id === room.id).length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">{currentRoom?.label || 'Checklist'}</h2>
          {currentRoom?.items.map((item, i) => (
            <label key={i} className="flex items-start gap-2 py-1 text-sm">
              <input type="checkbox" className="mt-0.5" />
              <span>{item}</span>
            </label>
          ))}
        </div>

        {/* Photos */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Photos - {currentRoom?.label}</h2>
            <label className="block">
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50">
                {uploading ? 'Uploading...' : 'Click or drag to upload a photo'}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {roomPhotos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onAnalyze={handleAnalyze}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Red Flags Reference */}
      {checklist.redFlags && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Common Red Flags Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.redFlags.map((flag, i) => (
              <div key={i} className={`p-2 rounded text-sm ${
                flag.severity === 'critical' ? 'bg-red-50 text-red-700' :
                flag.severity === 'major' ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <div className="font-medium">{flag.issue}</div>
                <div className="text-xs">Estimated: {flag.estimatedCost}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
