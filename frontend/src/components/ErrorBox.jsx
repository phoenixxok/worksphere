export default function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{message}</p>
  );
}
