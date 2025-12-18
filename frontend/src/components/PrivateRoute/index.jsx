import React from "react";
import RouteWithSidebar from "../RouteWithSidebar";
import usePrivateRoute from "./usePrivateRoute";
import { Navigate, useNavigate } from "react-router-dom";
import { AdminRoutes } from "../../routes";
import { useEffect } from "react";
import { getLoginToken } from "../../utils/storageUtils";

const PrivateRoute = ({ isWithoutCard = false, children, module }) => {
  const { userDetails, loading, permissions } = usePrivateRoute();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getLoginToken()) navigate(AdminRoutes.AdminSignin);
  }, [getLoginToken()]);

  if (!permissions) {
    return <></>;
  }
  return (
    userDetails &&
    !loading &&
    (!module ||
    permissions[Object.keys(module)?.[0]]?.includes(
      module[Object.keys(module)?.[0]]
    ) ? (
      <RouteWithSidebar>
        {isWithoutCard ? children : <div className="app-page app-page--surface">{children}</div>}
      </RouteWithSidebar>
    ) : (
      <Navigate replace to={AdminRoutes.Profile} />
    ))
  );
};

export default PrivateRoute;
