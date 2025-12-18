import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./navbar.scss";
import {
  Button,
  OverlayTrigger,
  Tooltip,
  Badge,
  Form,
  Col,
  Dropdown
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUserAlt,
  faSignOutAlt,
  faBars,
  faXmark,
  faTriangleExclamation,
  faCalendarDays,
  faClock,
  faCircleChevronLeft,
  faCircleChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useUserStore } from "../../store/store";
import Notifications from "../Notifications/Notifications";
import { toast } from "../Toast";
import { AdminRoutes, AffiliateRoute } from "../../routes";

import { useLogoutUser } from "../../reactQuery/hooks/customMutationHook";
import { getItem, removeLoginToken, setItem } from "../../utils/storageUtils";
// import useNotifications from "../../pages/NotificationCenter/hooks/useNotifications";
import { getFormattedTimeZoneOffset } from "../../utils/helper";
import { timeZones } from "../../pages/Dashboard/constants";
import CriticalNotifications from "../Notifications/CriticalNotifications";
import useCriticalNotifications from "../../pages/NotificationCenter/hooks/useCriticalNotifications";
import useCheckPermission from "../../utils/checkPermission";

const Navbar = ({ open, setOpen, collapseSidebar, setCollapseSidebar }) => {
  const { t } = useTranslation(["sidebar"]);
  const navigate = useNavigate();
  const isUserAffiliate = useUserStore((state) => state.isUserAffiliate);
  const userDetails = useUserStore((state) => state.userDetails);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [alertpopoverOpen, setAlertPopoverOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [alertcount, setAlertCount] = useState(0)
  const notificationRef = useRef(null);
  const alertNotificationRef = useRef(null);
  const currentTimeZone = getItem("timezone");
  const currentTimezoneOffset = timeZones?.find(
    (x) => x.code === currentTimeZone
  )?.value;
  const timeZoneOffset = getFormattedTimeZoneOffset();
  const [timeStamp, setTimeStamp] = useState(
    currentTimezoneOffset ? currentTimezoneOffset : timeZoneOffset
  );
  const [tzQuery, setTzQuery] = useState("");
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const { isHidden } = useCheckPermission();
  // const { count } = useNotifications({showNotification: false});
  const { setTimeZoneCode } = useUserStore((state) => state);
  // const { alertcount, refetchCriticalNotifications } = useCriticalNotifications({showNotification: false});
  useEffect(() => {
    setTimeZoneCode(timeZones.find((x) => x.value === timeStamp)?.code);
    setItem("timezone", timeZones.find((x) => x.value === timeStamp)?.code);
  }, [timeStamp]);

  const togglePopover = () => {
    setPopoverOpen(!popoverOpen);
    // refetchNotifications()
  };
  const alerttogglePopover = () => {
    setAlertPopoverOpen(!alertpopoverOpen);

  };

  const logoutUser = () => {
    removeLoginToken();
    localStorage.clear();
    toast(t("logoutSuccessToast"), "success", "logoutToast");
    navigate(
      isUserAffiliate ? AffiliateRoute.AffiliateSignIn : AdminRoutes.AdminSignin
    );
  };

  const { mutate: logout } = useLogoutUser({ onSuccess: () => logoutUser() });

  const selectedTz = timeZones?.find((x) => x.value === timeStamp);
  const filteredTimeZones = (timeZones || []).filter(({ labelKey, code, value }) => {
    const q = (tzQuery || "").trim().toLowerCase();
    if (!q) return true;
    return (
      String(labelKey).toLowerCase().includes(q) ||
      String(code).toLowerCase().includes(q) ||
      String(value).toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className={`app-navbar d-flex justify-content-between align-items-center ${open ? 'is-menu-open' : ''}`}>
        <div className="app-navbar__left">
          {/* Sidebar collapse toggle should live on the top navbar (top-left) */}
          <button
            type="button"
            className="btn nav-icon-btn app-navbar__collapse-toggle"
            onClick={() => setCollapseSidebar?.(!collapseSidebar)}
            aria-label={collapseSidebar ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FontAwesomeIcon icon={collapseSidebar ? faCircleChevronRight : faCircleChevronLeft} />
          </button>

          <button
            type="button"
            className="app-navbar__brand"
            onClick={() => navigate(AdminRoutes.Dashboard)}
            aria-label="Go to dashboard"
          >
            <img src="/GammaSweep_Logo.png" alt="Brand" className="app-navbar__logo" />
            <span
              className="app-navbar__user"
              title={`${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`.trim()}
            >
              {userDetails ? `${userDetails?.firstName} ${userDetails?.lastName}` : ""}
            </span>
          </button>
        </div>

        <div className="app-navbar__right d-flex align-items-center">
          {/* Mobile menu toggle (hidden on desktop via CSS) */}
          <OverlayTrigger
            key="menu"
            placement="bottom"
            overlay={
              <Tooltip id={`tooltip-menu`}>
                {!open ? <strong>Open Menu</strong> : <strong>Close Menu</strong>}
              </Tooltip>
            }
          >
            <Button
              onClick={() => setOpen((current) => !current)}
              variant="link"
              className={`btn menu-btn nav-icon-btn ${open ? 'menu-btn--active' : ''}`}
            >
              {!open ? <FontAwesomeIcon icon={faBars} /> : <FontAwesomeIcon icon={faXmark} />}
            </Button>
          </OverlayTrigger>

          <div className="app-navbar__group">
            <div className="notification-popup">

              <OverlayTrigger
                key="critcalAlert"
                placement="bottom"
                overlay={
                  <Tooltip id={`alert-notifications`}>
                    <strong>Critical Notifications</strong>
                  </Tooltip>
                }
              >
                <Button
                  ref={alertNotificationRef}
                  onClick={alerttogglePopover}
                  variant="link"
                  className="btn notification-btn nav-icon-btn nav-icon-btn--critical"
                >
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  {alertcount > 0 ? (
                    <Badge bg="secondary" className="translate-middle rounded-pill">
                      {alertcount}
                    </Badge>
                  ) : null}
                </Button>
              </OverlayTrigger>
              <CriticalNotifications
                isOpen={alertpopoverOpen}
                onClose={() => setAlertPopoverOpen(false)}
                title="Critical Notification"
                alertcount={alertcount}
                setAlertCount={setAlertCount}
                targetElement={alertNotificationRef.current}
              />
            </div>
        {/* <div className="notification-popup">
          <OverlayTrigger
            key="notifications"
            placement="bottom"
            overlay={
              <Tooltip id={`tooltip-notifications`}>
                <strong>Critical Alert</strong>
              </Tooltip>
            }
          >
            <Button
              ref={notificationRef}
              onClick={togglePopover}
              className="btn notification-btn"
            >
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="me-1"
                style={{ color: "rgb(204, 48, 48)" }}
              />
              <Badge bg="secondary" className="translate-middle rounded-pill">
                {count}
              </Badge>
            </Button>
          </OverlayTrigger>

          <Notifications isOpen={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            title="Notifications"
            targetElement={notificationRef.current} />

        </div>
        */}
            <div className="notification-popup">
          <OverlayTrigger
            key="notifications"
            placement="bottom"
            overlay={
              <Tooltip id={`tooltip-notifications`}>
                <strong>Notifications</strong>
              </Tooltip>
            }
          >
            <Button
              ref={notificationRef}
              onClick={togglePopover}
              variant="link"
              className="btn notification-btn nav-icon-btn"
            >
              <FontAwesomeIcon
                icon={faBell}
              />
              {count > 0 ? (
                <Badge bg="secondary" className="translate-middle rounded-pill">
                  {count}
                </Badge>
              ) : null}
            </Button>
          </OverlayTrigger>

          <Notifications isOpen={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            title="Notifications"
            count={count}
            setCount={setCount}
            targetElement={notificationRef.current} />

            </div>
          </div>

          <div className="app-navbar__divider" />

          <div className="app-navbar__group">
            {isHidden({ module: { key: "Calender", value: "R" } }) ? null : (
              <OverlayTrigger
                key="calendar"
                placement="bottom"
                overlay={
                  <Tooltip id={`tooltip-calendar`}>
                    <strong>Scheduled Events</strong>
                  </Tooltip>
                }
              >
                <Button
                  onClick={() => navigate(AdminRoutes.Calendar)}
                  variant="link"
                  className="btn profile-btn nav-icon-btn"
                >
                  <FontAwesomeIcon icon={faCalendarDays} />
                </Button>
              </OverlayTrigger>
            )}

            <OverlayTrigger
              key="profile"
              placement="bottom"
              overlay={
                <Tooltip id={`tooltip-profile`}>
                  <strong>Profile</strong>
                </Tooltip>
              }
            >
              <Button
                onClick={() => navigate(AdminRoutes.Profile)}
                variant="link"
                className="btn profile-btn nav-icon-btn"
              >
                <FontAwesomeIcon icon={faUserAlt} />
              </Button>
            </OverlayTrigger>
          </div>

          <div className="app-navbar__divider" />

          <div className="app-navbar__group">
            <Dropdown align="end" className="timezone-dropdown" autoClose="outside">
          <Dropdown.Toggle className="timezone-dropdown__toggle" id="timezone-dropdown">
            <FontAwesomeIcon icon={faClock} className="timezone-dropdown__icon" />
            <span className="timezone-dropdown__value" title={selectedTz ? `${t(selectedTz.labelKey)} (${selectedTz.code}) ${selectedTz.value}` : ""}>
              {selectedTz ? `${selectedTz.code} ${selectedTz.value}` : timeStamp}
            </span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="timezone-dropdown__menu">
            <div className="timezone-dropdown__search">
              <Form.Control
                value={tzQuery}
                onChange={(e) => setTzQuery(e.target.value)}
                placeholder="Search timezone…"
                aria-label="Search timezone"
              />
            </div>
            <div className="timezone-dropdown__list">
              {filteredTimeZones.map(({ labelKey, value, code }) => (
                <Dropdown.Item
                  key={value}
                  active={value === timeStamp}
                  onClick={() => {
                    setTimeStamp(value);
                    setTzQuery("");
                  }}
                  className="timezone-dropdown__item"
                >
                  <div className="timezone-dropdown__item-main">
                    <span className="timezone-dropdown__item-code">{code}</span>
                    <span className="timezone-dropdown__item-offset">{value}</span>
                  </div>
                  <div className="timezone-dropdown__item-sub">
                    {t(labelKey)}
                  </div>
                </Dropdown.Item>
              ))}
              {filteredTimeZones.length === 0 ? (
                <div className="timezone-dropdown__empty">No timezones found</div>
              ) : null}
            </div>
          </Dropdown.Menu>
            </Dropdown>
          </div>

          <div className="app-navbar__divider" />

          <div className="app-navbar__group">
            <OverlayTrigger
              key="logout"
              placement="bottom"
              overlay={
                <Tooltip id={`tooltip-logout`}>
                  <strong>Logout</strong>
                </Tooltip>
              }
            >
          <Button onClick={() => logout()} variant="link" className="btn navbar-logout-btn nav-icon-btn">
            <FontAwesomeIcon
              icon={faSignOutAlt}
            />
          </Button>
            </OverlayTrigger>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;