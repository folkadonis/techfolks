import { Link } from 'react-router-dom'

const HomePage = () => {
  return (
    <div className="min-h-[calc(100vh-16rem)]">
      {/* Hero Section */}
      <div className="text-center py-20">
        <h1 className="text-5xl font-bold text-foreground mb-6">
          Welcome to TechFolks
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Sharpen your coding skills, compete with peers, and prepare for technical interviews
          on our competitive programming platform.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/problems" className="btn btn-primary px-6 py-3">
            Start Solving
          </Link>
          <Link to="/contests" className="btn btn-outline px-6 py-3">
            Join Contest
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
        <div className="card p-6 text-center">
          <h3 className="text-xl font-semibold mb-3">1000+ Problems</h3>
          <p className="text-muted-foreground">
            Practice with a vast collection of coding problems across various difficulty levels
          </p>
        </div>
        <div className="card p-6 text-center">
          <h3 className="text-xl font-semibold mb-3">Weekly Contests</h3>
          <p className="text-muted-foreground">
            Participate in regular contests and compete with programmers worldwide
          </p>
        </div>
        <div className="card p-6 text-center">
          <h3 className="text-xl font-semibold mb-3">Real-time Code Execution</h3>
          <p className="text-muted-foreground">
            Write, test, and submit your solutions with instant feedback
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-20 bg-muted rounded-lg p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary">10K+</div>
            <div className="text-muted-foreground">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">1M+</div>
            <div className="text-muted-foreground">Submissions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">500+</div>
            <div className="text-muted-foreground">Contests Held</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">15+</div>
            <div className="text-muted-foreground">Languages Supported</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage