import { useState } from "react";
import { Form, Alert, Spinner } from "react-bootstrap";
import { signupUser } from "../services/api";
import "./signup.css";

interface FormData {
  name: string;
  email: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

const Signup = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
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
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const response = await signupUser(formData);

      if (response.id) {
        setSuccessMessage(
          "User registered successfully! Redirecting to signin...",
        );
        setFormData({ name: "", email: "", password: "" });

        // Redirect to signin page after 3 seconds
        setTimeout(() => {
          window.location.href = "/signin";
        }, 3000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Signup failed. Please try again.";
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
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">
              Join Ampify and discover amazing music
            </p>
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

          <Form onSubmit={handleSignup} className="signup-form">
            {/* Name Field */}
            <div className="form-group-wrapper">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <Form.Control
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                isInvalid={!!errors.name}
                disabled={loading}
                className="form-control"
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

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
                placeholder="Enter your password (min 8 characters)"
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
                  Signing up...
                </>
              ) : (
                "Sign Up"
              )}
            </button>

            {/* Sign In Link */}
            <div className="signin-link-wrapper">
              <span>Already have an account? </span>
              <a href="/signin">Sign In</a>
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
};

export default Signup;
