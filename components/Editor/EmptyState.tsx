/**
 * Empty State Component
 * Shown when no file is selected
 */

export default function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <div className="text-6xl mb-4"></div>
        <p className="text-lg mb-2">No file selected</p>
        <p className="text-sm">Open a file from the sidebar to start editing</p>
      </div>
    </div>
  );
}
