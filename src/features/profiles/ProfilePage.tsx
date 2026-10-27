import { useParams } from 'react-router-dom';

export function ProfilePage() {
  const { id } = useParams();
  return (
    <div className="px-8 py-7">
      <h1 className="text-h1">Profile · {id}</h1>
    </div>
  );
}
