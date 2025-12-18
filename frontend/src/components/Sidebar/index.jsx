
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom'
import SimpleBar from 'simplebar-react';
import { CSSTransition } from 'react-transition-group';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleChevronLeft, faCircleChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Nav, Badge, Image, Accordion, OverlayTrigger, Tooltip } from '@themesberg/react-bootstrap';
// import { removeLoginToken } from '../../utils/storageUtils'
// import { toast } from '../../components/Toast'
// import { AdminRoutes, AffiliateRoute } from '../../routes';
import { useUserStore } from '../../store/store'
import { useTranslation } from 'react-i18next'
import { InlineLoader } from '../Preloader'
// import { useLogoutUser } from '../../reactQuery/hooks/customMutationHook';
import { affiliateNavLink, navItems } from '../../utils/navItems';

const Sidebar = (props) => {
  const { t } = useTranslation(['sidebar'])
  const location = useLocation();
  const { pathname } = location;
  const [show, setShow] = useState(false);
  const showClass = show ? 'show' : '';
  const userDetails = useUserStore((state) => state.userDetails)
  const permissions = useUserStore((state) => state.permissions)
  // const navigate = useNavigate()
  const isUserAffiliate = useUserStore((state) => state.isUserAffiliate)
  // const logoutUser = () => {
  //   removeLoginToken()
  //   localStorage.clear()
  //   toast(t('logoutSuccessToast'), 'success', 'logoutToast')
  //   navigate(isUserAffiliate ? AffiliateRoute.AffiliateSignIn : AdminRoutes.AdminSignin)
  // }
  const scrollTopRef = useRef(0);
  const scrollBarRef = useRef(null);
  const scrollEndTimerRef = useRef(null);


  useEffect(() => {
    const scrollEl = scrollBarRef.current?.getScrollElement?.();
    if (!scrollEl) return;

    const handleScroll = () => {
      scrollTopRef.current = scrollEl.scrollTop;

      const atTop = scrollEl.scrollTop <= 2;
      const atBottom =
        scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2;

      // Toggle CSS hooks for scroll "effects"
      scrollEl.classList.toggle('sb-at-top', atTop);
      scrollEl.classList.toggle('sb-at-bottom', atBottom);
      scrollEl.classList.toggle('sb-is-scrolled', !atTop);

      // Brief pulse while actively scrolling
      scrollEl.classList.add('sb-is-scrolling');
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        scrollEl.classList.remove('sb-is-scrolling');
      }, 140);
    };

    // Initialize once
    handleScroll();
    scrollEl.addEventListener('scroll', handleScroll);
    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);


  useLayoutEffect(() => {
    const scrollEl = scrollBarRef.current?.getScrollElement?.();
    if (scrollEl) {
      scrollEl.scrollTop = scrollTopRef.current;
    }
  });

  // const { mutate: logout } = useLogoutUser({ onSuccess: () => logoutUser() })

  const activeAccordianKey = (path, key) => {
    return pathname.includes(path) && key
  }

  const CollapsableNavItem = (props) => {
    const { permissionLabel, accordianPath, eventKey, titleKey, icon, children = null } = props;

    if (permissionLabel && !Object.keys(permissions).includes(permissionLabel)) return (<></>);

    return (
      <Accordion as={Nav.Item} defaultActiveKey={activeAccordianKey(accordianPath, eventKey)} style={{ backgroundColor: '#1a1a1a', border: 'none', boxShadow: 'none' }}>
        <Accordion.Item eventKey={eventKey} style={{ backgroundColor: '#1a1a1a', border: 'none', boxShadow: 'none' }}>
          <Accordion.Button as={Nav.Link} style={{ backgroundColor: '#1a1a1a', border: 'none', boxShadow: 'none' }} className='d-flex justify-content-between align-items-center'>
            {props.collapseSidebar ? (
              <OverlayTrigger
                key={titleKey}
                placement='right'
                overlay={
                  <Tooltip id={`tooltip-${titleKey}`}>
                    <strong>{t(titleKey)}</strong>
                  </Tooltip>
                }
              >
                <span className='sidebar-icon'><FontAwesomeIcon icon={icon} /></span>
              </OverlayTrigger>
            ) : (
              <span>
                <span className='sidebar-icon'><FontAwesomeIcon icon={icon} /> </span>
                <span className='sidebar-text'>{t(titleKey)}</span>
              </span>
            )}
          </Accordion.Button>
          <Accordion.Body className='multi-level' style={{ backgroundColor: '#1a1a1a' }}>
            <Nav className='flex-column'>
              {children}
            </Nav>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  };

  const handlePathName = (pathname) => {
    const allowedPlayerPaths = ["/admin/players", "admin/player-details"];
    const allowedCMSPaths = ["/admin/cms", "/admin/create-cms"];
    const staffPaths = ["/admin/staff", "/admin/edit-admin", "/admin/admin-details", "/admin/create-admin"];
    const categoryPaths = ["/admin/casino-management/reorder-categories"];
    const subCategoryPaths = ["/admin/casino-management/reorder-sub-categories"];
    const gamesPaths = ["/admin/casino-management/reorder-games"];
    const createPackagePaths = ["/admin/packages/create-package"];
    const reorderPackagePaths = ["/admin/reorder-package"];
    const createTournamentPaths = ["admin/create-tournaments"];
    if (allowedPlayerPaths.some(path => pathname.includes(path))) {
      return "/admin/players";
    }
    if (allowedCMSPaths.some(path => pathname.includes(path))) {
      return "/admin/cms";
    }
    if (staffPaths.some(path => pathname.includes(path))) {
      return "/admin/staff";
    }
    if (categoryPaths.some(path => pathname.includes(path))) {
      return "/admin/casino-management/casino-categories"
    }
    if (subCategoryPaths.some(path => pathname.includes(path))) {
      return "/admin/casino-management/casino-sub-categories"
    }
    if (gamesPaths.some(path => pathname.includes(path))) {
      return "/admin/casino-management/casino-games"
    }
    if (createPackagePaths.some(path => pathname.includes(path))) {
      return "/admin/packages"
    }
    if (reorderPackagePaths.some(path => pathname.includes(path))) {
      return "/admin/packages"
    }
    if (createTournamentPaths.some(path => pathname.includes(path))) {
      return "/admin/tournament"
    }
    // If none of the conditions match, return the original pathname
    return pathname;
  }

  const NavItem = (props) => {

    const { key, title, permissionLabel, inSidePermissionLabel, link, external, target, icon, image, badgeText, badgeBg = 'secondary', badgeColor = 'primary' } = props;
    const classNames = badgeText ? 'd-flex justify-content-start align-items-center justify-content-between' : '';
    const navItemClassName = link === handlePathName(pathname) ? 'active' : '';
    const linkProps = external ? { href: link } : { as: Link, to: link };
    if (permissionLabel && !Object.keys(permissions).includes(permissionLabel)) return (<></>);
    if (inSidePermissionLabel && !permissions?.[permissionLabel]?.includes(inSidePermissionLabel)) return (<></>);
    return (
      <Nav.Item className={navItemClassName} onClick={() => setShow(false)}>
        <Nav.Link {...linkProps} target={target} className={classNames}>
          {props.collapseSidebar ? (
            <OverlayTrigger
              key={key}
              placement='right'
              overlay={
                <Tooltip id={`tooltip-${key}`}>
                  <strong>{title}</strong>
                </Tooltip>
              }
            >
              <span>
                {icon ? <span className='sidebar-icon'><FontAwesomeIcon icon={icon} /> </span> : null}
                {image ? <Image src={image} width={20} height={20} className='sidebar-icon svg-icon' /> : null}
              </span>
            </OverlayTrigger>
          ) : (
            <span>
              {icon ? <span className='sidebar-icon'><FontAwesomeIcon icon={icon} /> </span> : null}
              {image ? <Image src={image} width={20} height={20} className='sidebar-icon svg-icon' /> : null}
              <span className='sidebar-text'>{title}</span>
            </span>
          )}
          {badgeText ? (
            <Badge pill bg={badgeBg} text={badgeColor} className='badge-md notification-count ms-2'>{badgeText}</Badge>
          ) : null}
        </Nav.Link>
      </Nav.Item>
    );
  };

  const renderNavItems = (nItems) => nItems.map((item) => {
    return (
      item?.isCollapsable ?
        <CollapsableNavItem permissionLabel={item.permissionLabel} key={item.titleKey} accordianPath={item.path} eventKey={item.titleKey} titleKey={item.titleKey} icon={item.icon} collapseSidebar={props.collapseSidebar} >
          {item?.options && renderNavItems(item.options)}
        </CollapsableNavItem>
        :
        <NavItem key={item.titleKey} title={t(item.titleKey)} link={item.link} icon={item.icon} permissionLabel={item?.permissionLabel} inSidePermissionLabel={item?.inSidePermissionLabel} collapseSidebar={props.collapseSidebar} />
    )
  })

  return (
    <CSSTransition style={props.collapseSidebar ? { width: "120px" } : {}} timeout={300} in={show} classNames='sidebar-transition'>
      <SimpleBar
        ref={scrollBarRef}
        autoHide={false}
        className={`collapse ${showClass} ${props.open ? 'd-block' : 'd-md-block'} sidebar d-md-block text-white`}
      >
        <div className='sidebar-inner px-4 pt-3'>

          <Nav className='flex-column pt-3 pt-md-0'>

            {userDetails ? null : (
              <div className='d-flex justify-content-center'><InlineLoader /></div>
            )}
            {renderNavItems(isUserAffiliate ? affiliateNavLink : navItems)}
            {/* {!props.collapseSidebar
                ? (
                  <Button
                    onClick={() => logout()}
                    variant='secondary'
                    className='logout-btn'
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className='me-1' />
                      {t('logout')}
                  </Button>
                )
                : (
                  <OverlayTrigger
                  key="logout"
                  placement='right'
                  overlay={
                    <Tooltip id={`tooltip-logout`}>
                      <strong>Logout</strong>
                    </Tooltip>
                  }
                >
                  <Button
                    onClick={() => logout()}
                    variant='secondary'
                    className='collapsed-logout-btn'
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className='me-1' />
                  </Button>
                </OverlayTrigger>
                )
              } */}
          </Nav>
        </div>
      </SimpleBar>
    </CSSTransition>
  );
};
export default Sidebar