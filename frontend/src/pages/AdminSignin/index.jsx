import React, { useEffect, useState } from "react";
import { Formik, Form, ErrorMessage } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faEye,
  faEyeSlash,
  faUnlockAlt,
} from "@fortawesome/free-solid-svg-icons";
import {
  Spinner,
  Col,
  Row,
  Form as BForm,
  Container,
  InputGroup,
} from "@themesberg/react-bootstrap";
// Removed illustration background for custom casino theme
import { adminLoginSchema } from "./schema";
import useAdminSignin from "./useAdminSignin";
import QRBlock from "../ProfilePage/components/QRBlock";
import { Helmet } from "react-helmet";

const AdminSignIn = () => {
  const {
    loading,
    handleSignIn,
    t,
    qrcodeUrlInfo,
    toggleForQRModal,
    allowLogin,
  } = useAdminSignin();

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Login page should never scroll; lock viewport only while this route is mounted.
    document.documentElement.classList.add("login-no-scroll");
    document.body.classList.add("login-no-scroll");
    return () => {
      document.documentElement.classList.remove("login-no-scroll");
      document.body.classList.remove("login-no-scroll");
    };
  }, []);

  return (
    <main>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className="d-flex align-items-center my-5 mt-lg-6 mb-lg-5 casino-login-section">
        <Container>
          <Row
            className="justify-content-center"
          >
            <Col
              xs={12}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="card shadow-soft border p-4 p-lg-5 w-100 fmxw-500 fade-in">
                <div className="text-center text-md-center mb-4 mt-md-0">
                  <div className="login-brand">
                    <img
                      src={`${process.env.PUBLIC_URL}/GammaSweep_Logo.png`}
                      alt="SWEEP"
                      className="fade-in login-brand__logo"
                    />
                    <span className="login-brand__tagline">
                      ICE Barcelona 26 Edition
                    </span>
                  </div>
                </div>

                <Formik
                  initialValues={{ email: "", password: "" }}
                  validationSchema={adminLoginSchema(t)}
                  onSubmit={({ email, password }) =>
                    handleSignIn({ email, password })
                  }
                >
                  {({
                    touched,
                    errors,
                    values,
                    handleChange,
                    handleSubmit,
                    handleBlur,
                  }) => (
                    <div>
                      <Form>
                        <div className="form-group">
                          <label htmlFor="email">
                            {t("InputField.email.label")}
                          </label>

                          <InputGroup
                            className={
                              touched.email && errors.email
                                ? "border border-danger"
                                : ""
                            }
                          >
                            <InputGroup.Text>
                              <FontAwesomeIcon icon={faEnvelope} />
                            </InputGroup.Text>

                            <BForm.Control
                              name="email"
                              autoFocus
                              required
                              type="email"
                              placeholder="example@company.com"
                              value={values.email}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                          </InputGroup>

                          <ErrorMessage
                            component="div"
                            name="email"
                            className="error-message"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="password" className="mt-3">
                            {t("InputField.password.label")}
                          </label>

                          <InputGroup
                            className={
                              touched.password && errors.password
                                ? "border border-danger"
                                : ""
                            }
                          >
                            <InputGroup.Text>
                              <FontAwesomeIcon icon={faUnlockAlt} />
                            </InputGroup.Text>

                            <BForm.Control
                              name="password"
                              required
                              type={`${showPassword ? "text" : "password"}`}
                              placeholder="qwerty"
                              value={values.password}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            <InputGroup.Text
                              style={{ cursor: "pointer" }}
                              className="b-1"
                            >
                              <FontAwesomeIcon
                                icon={
                                  !showPassword === true ? faEyeSlash : faEye
                                }
                                onClick={() => {
                                  setShowPassword((showPass) => !showPass);
                                }}
                              />
                            </InputGroup.Text>
                          </InputGroup>

                          <ErrorMessage
                            component="div"
                            name="password"
                            className="error-message"
                          />
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary btn-block mt-4 w-100"
                          disabled={loading || !values.email || !values.password}
                          style={{
                            width: '100%',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              {t("signInButton")}
                            </>
                          ) : (
                            t("signInButton")
                          )}
                        </button>
                      </Form>
                    </div>
                  )}
                </Formik>
              </div>
            </Col>
          </Row>
        </Container>
        <QRBlock
          qrcodeUrlInfo={qrcodeUrlInfo}
          allowLogin={allowLogin}
          toggleForQRModal={toggleForQRModal}
        />
      </section>
    </main>
  );
};
export default AdminSignIn;
