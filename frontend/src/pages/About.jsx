function About() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About Safe Route</h1>
      <div className="prose prose-lg">
        <p className="mb-4">
          Safe Route is an intelligent route planning application that helps you find
          the safest path to your destination in Pune. Our system analyzes various
          factors including:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>Crime rates in different areas</li>
          <li>Traffic conditions</li>
          <li>Road quality</li>
          <li>Lighting conditions</li>
          <li>Proximity to emergency services</li>
          <li>Historical accident data</li>
        </ul>
        <p className="mb-4">
          Using advanced machine learning algorithms, we process this data to
          calculate safety scores for different routes, helping you make informed
          decisions about your journey.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
        <p className="mb-4">
          When you enter your start and end locations, our system:
        </p>
        <ol className="list-decimal pl-6 mb-6">
          <li>Identifies multiple possible routes</li>
          <li>Analyzes safety factors along each route</li>
          <li>Calculates comprehensive safety scores</li>
          <li>Presents you with the safest options</li>
        </ol>
      </div>
    </div>
  );
}

export default About; 