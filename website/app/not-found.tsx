import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page not-found">
      <div className="container">
        <div className="card">
          <h1>Page not found</h1>
          <p style={{ marginTop: '0.8rem' }}>
            The requested URL does not exist. Use the main navigation or go back to the homepage.
          </p>
          <p style={{ marginTop: '1rem' }}>
            <Link href="/" className="btn btn-primary">
              Return home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
