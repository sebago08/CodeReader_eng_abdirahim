import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    setLocation("/auth");
  };

  const handleSignUp = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Black Background */}
      <div className="w-1/2 bg-black text-white p-12 flex flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white transform rotate-45"></div>
          <h1 className="text-2xl font-bold">ConstructTrack</h1>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <h2 className="text-5xl font-bold leading-tight">
            Your Project, Perfectly<br />Planned.
          </h2>
          <p className="text-gray-400 text-lg max-w-md">
            The ultimate platform for tracking construction projects from groundbreaking to completion.
          </p>
        </div>

        {/* Empty space for balance */}
        <div></div>
      </div>

      {/* Right Side - Light Background */}
      <div className="w-1/2 bg-gray-50 flex items-center justify-center p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Welcome Back</h2>
          </div>

          {/* Sign In / Sign Up Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleSignIn}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              data-testid="button-sign-in"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              data-testid="button-sign-up"
            >
              Sign Up
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">OR</span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              data-testid="button-google-signin"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>

            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              data-testid="button-microsoft-signin"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Sign in with Microsoft</span>
            </button>
          </div>

          {/* Terms and Privacy */}
          <p className="text-center text-sm text-gray-500">
            By continuing, you agree to ConstructTrack's{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
