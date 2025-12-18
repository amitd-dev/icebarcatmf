import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Nav, Badge, Image, Button } from "@themesberg/react-bootstrap";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import SimpleBar from "simplebar-react";

import { useLogoutUser } from "../../reactQuery/hooks/customMutationHook";
import { AdminRoutes, AffiliateRoute } from "../../routes";
import { useUserStore } from "../../store/store";
import { affiliateNavLink } from "../../utils/navItems";
import { removeLoginToken } from "../../utils/storageUtils";
import { InlineLoader } from "../Preloader";
import { toast } from "../Toast";

const AffiliateSidebar = (props) => {
  const { t } = useTranslation(["sidebar"]);
  const location = useLocation();
  const { pathname } = location;
  const [show, setShow] = useState(false);
  const showClass = show ? "show" : "";
  const scrollBarRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const userDetails = useUserStore((state) => state.userDetails);
  // const permissions = useUserStore((state) => state.permissions)
  const navigate = useNavigate();
  const isUserAffiliate = useUserStore((state) => state.isUserAffiliate);
  const logoutUser = () => {
    removeLoginToken();
    toast(t("logoutSuccessToast"), "success", "logoutToast");
    navigate(
      isUserAffiliate ? AffiliateRoute.AffiliateSignIn : AdminRoutes.AdminSignin
    );
  };

  const { mutate: logout } = useLogoutUser({ onSuccess: () => logoutUser() });

  useEffect(() => {
    const scrollEl = scrollBarRef.current?.getScrollElement?.();
    if (!scrollEl) return;

    const handleScroll = () => {
      const atTop = scrollEl.scrollTop <= 2;
      const atBottom =
        scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2;

      scrollEl.classList.toggle("sb-at-top", atTop);
      scrollEl.classList.toggle("sb-at-bottom", atBottom);
      scrollEl.classList.toggle("sb-is-scrolled", !atTop);

      scrollEl.classList.add("sb-is-scrolling");
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        scrollEl.classList.remove("sb-is-scrolling");
      }, 140);
    };

    handleScroll();
    scrollEl.addEventListener("scroll", handleScroll);
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  // const activeAccordianKey = (path, key) => {
  //   return pathname.includes(path) && key
  // }

  // const CollapsableNavItem = (props) => {
  //   const { permissionLabel, accordianPath, eventKey, titleKey, icon, children = null } = props;

  //   if(permissionLabel && !Object.keys(permissions).includes(permissionLabel)) return(<></>);

  //   return (
  //     <Accordion as={Nav.Item} defaultActiveKey={activeAccordianKey(accordianPath, eventKey)} style={{backgroundColor: 'rgb(38,43,64)', border: 'none', boxShadow: 'none'}}>
  //       <Accordion.Item eventKey={eventKey} style={{backgroundColor: 'rgb(38,43,64)', border: 'none', boxShadow: 'none'}}>
  //         <Accordion.Button as={Nav.Link} style={{backgroundColor: 'rgb(38,43,64)', border: 'none', boxShadow: 'none'}} className='d-flex justify-content-between align-items-center'>
  //           <span>
  //             <span className='sidebar-icon'><FontAwesomeIcon icon={icon} /> </span>
  //             <span className='sidebar-text'>{t(titleKey)}</span>
  //           </span>
  //         </Accordion.Button>
  //         <Accordion.Body className='multi-level' style={{backgroundColor: 'rgb(38,43,64)'}}>
  //           <Nav className='flex-column'>
  //             {children}
  //           </Nav>
  //         </Accordion.Body>
  //       </Accordion.Item>
  //     </Accordion>
  //   );
  // };

  const handlePathName = (pathname) => {
    const allowedPlayerPaths = ["/admin/players", "admin/player-details"];
    const allowedCMSPaths = ["/admin/cms", "/admin/create-cms"];
    const staffPaths = [
      "/admin/staff",
      "/admin/edit-admin",
      "/admin/admin-details",
      "/admin/create-admin",
    ];
    const categoryPaths = ["/admin/casino-management/reorder-categories"];
    const subCategoryPaths = [
      "/admin/casino-management/reorder-sub-categories",
    ];
    const gamesPaths = ["/admin/casino-management/reorder-games"];
    if (allowedPlayerPaths.some((path) => pathname.includes(path))) {
      return "/admin/players";
    }
    if (allowedCMSPaths.some((path) => pathname.includes(path))) {
      return "/admin/cms";
    }
    if (staffPaths.some((path) => pathname.includes(path))) {
      return "/admin/staff";
    }
    if (categoryPaths.some((path) => pathname.includes(path))) {
      return "/admin/casino-management/casino-categories";
    }
    if (subCategoryPaths.some((path) => pathname.includes(path))) {
      return "/admin/casino-management/casino-sub-categories";
    }
    if (gamesPaths.some((path) => pathname.includes(path))) {
      return "/admin/casino-management/casino-games";
    }
    // If none of the conditions match, return the original pathname
    return pathname;
  };

  const NavItem = (props) => {
    const {
      title,
      link,
      external,
      target,
      icon,
      image,
      badgeText,
      badgeBg = "secondary",
      badgeColor = "primary",
    } = props;
    const classNames = badgeText
      ? "d-flex justify-content-start align-items-center justify-content-between"
      : "";
    const navItemClassName = link === handlePathName(pathname) ? "active" : "";
    const linkProps = external ? { href: link } : { as: Link, to: link };
    // if(permissionLabel && !Object.keys(permissions).includes(permissionLabel)) return(<></>);
    // if(inSidePermissionLabel && !permissions?.[permissionLabel]?.includes(inSidePermissionLabel)) return(<></>);
    return (
      <Nav.Item className={navItemClassName} onClick={() => setShow(false)}>
        <Nav.Link {...linkProps} target={target} className={classNames}>
          <span>
            {icon ? (
              <span className="sidebar-icon">
                <FontAwesomeIcon icon={icon} />{" "}
              </span>
            ) : null}
            {image ? (
              <Image
                src={image}
                width={20}
                height={20}
                className="sidebar-icon svg-icon"
              />
            ) : null}

            <span className="sidebar-text">{title}</span>
          </span>
          {badgeText ? (
            <Badge
              pill
              bg={badgeBg}
              text={badgeColor}
              className="badge-md notification-count ms-2"
            >
              {badgeText}
            </Badge>
          ) : null}
        </Nav.Link>
      </Nav.Item>
    );
  };

  const renderNavItems = (nItems) =>
    nItems.map((item) => {
      return (
        <NavItem
          key={item.titleKey}
          title={t(item.titleKey)}
          link={item.link}
          icon={item.icon}
          permissionLabel={item?.permissionLabel}
          inSidePermissionLabel={item?.inSidePermissionLabel}
        />
      );
    });

  return (
    <>
      <CSSTransition timeout={300} in={show} classNames="sidebar-transition">
        <SimpleBar
          ref={scrollBarRef}
          autoHide={false}
          className={`collapse ${showClass} ${
            props.open ? "d-block" : "d-md-block"
          } sidebar d-md-block bg-primary text-white`}
        >
          <div className="sidebar-inner px-4 pt-3">
            <Nav className="flex-column pt-3 pt-md-0">
              {userDetails ? (
                <div className="sidebar-brand">
                  <div className="sidebar-brand__top">
                    <img
                      src={"/logoImage.png"}
                      className="sidebar-brand__logo"
                      alt="Affiliate"
                    />
                  </div>
                  <div
                    className="sidebar-brand__name"
                    title={`${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`.trim()}
                  >
                    {`${userDetails?.firstName} ${userDetails?.lastName}`}
                  </div>
                </div>
              ) : (
                <div className="d-flex justify-content-center">
                  <InlineLoader />
                </div>
              )}
              <hr />
              {renderNavItems(affiliateNavLink)}

              <Button
                onClick={() => logout()}
                variant="secondary"
                className="upgrade-to-pro"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                {t("logout")}
              </Button>
            </Nav>
          </div>
        </SimpleBar>
      </CSSTransition>
    </>
  );
};
export default AffiliateSidebar;
