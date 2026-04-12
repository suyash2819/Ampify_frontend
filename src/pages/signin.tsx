import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Alert, Spinner } from "react-bootstrap";
import { signinUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../pages/signup.css";

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const Signin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle form submission
  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const response = await signinUser(formData);

      if (response.access_token) {
        login(response.access_token);
        setSuccessMessage("Signin successful! Redirecting...");
        setFormData({ email: "", password: "" });

        // Redirect to home page after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Signin failed. Please try again.";
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="signup-section">
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h1 className="signup-title">Sign In</h1>
            <p className="signup-subtitle">Welcome back to Ampify</p>
          </div>

          {successMessage && (
            <Alert
              variant="success"
              onClose={() => setSuccessMessage("")}
              dismissible
            >
              {successMessage}
            </Alert>
          )}

          {errors.general && (
            <Alert variant="danger" onClose={() => setErrors({})} dismissible>
              {errors.general}
            </Alert>
          )}

          <Form onSubmit={handleSignin} className="signup-form">
            {/* Email Field */}
            <div className="form-group-wrapper">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <Form.Control
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                isInvalid={!!errors.email}
                disabled={loading}
                className="form-control"
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            {/* Password Field */}
            <div className="form-group-wrapper">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <Form.Control
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                isInvalid={!!errors.password}
                disabled={loading}
                className="form-control"
              />
              {errors.password && (
                <div className="form-error">{errors.password}</div>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-signup" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="spinner"
                  />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Sign Up Link */}
            <div className="signin-link-wrapper">
              <span>Don't have an account? </span>
              <a href="/signup">Sign Up</a>
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
};

export default Signin;
