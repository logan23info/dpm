import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DPM Platform</h1>
        <p className="text-gray-500 mb-8">Data Protection Management & IT Audit RCM</p>
        <Link href="/dashboard" className="block w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          Go to Dashboard
        </Link>
      </div>
    </main>
  )
}
