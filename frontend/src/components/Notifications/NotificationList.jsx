import React, { useState, useEffect, useRef } from "react";
import { Card, ListGroup, InputGroup, Form, FormControl, Dropdown, ButtonGroup, Button } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCheckCircle, faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { useUserStore } from "../../store/store";
import NotificationDetail from "./NotificationDetail";
import "./notifications.scss";

// Group Notifications by Date
const groupNotificationsByDate = (notifications) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = { today: [], yesterday: [], older: [] };

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.createdAt);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      grouped.today.push(notif);
    } else if (notifDate.getTime() === yesterday.getTime()) {
      grouped.yesterday.push(notif);
    } else {
      grouped.older.push(notif);
    }
  });

  return grouped;
};

// Get Time Difference
const getTimeDifference = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
};

const NotificationList = ({
  notifications, 
  setSearch,
  isUnread,
  handleSetUnread,
  markReadNotifications,
  markAllReadNotifications,
  handleLoadMore,
  hasMore
}) => {

  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const userDetails = useUserStore((state) => state.userDetails);
  const [groupedNotifications, setGroupedNotifications] = useState(groupNotificationsByDate(notifications))

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setGroupedNotifications(groupNotificationsByDate(notifications))
  }, [notifications])

  // Infinite Scroll Handler
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const el = scrollContainerRef.current;
        if (!el || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          handleLoadMore();
        }
      });
    };

    const container = scrollContainerRef.current;
    if (container) container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (container) container.removeEventListener("scroll", handleScroll, { passive: true });
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [hasMore, handleLoadMore]);

  return (
    <Card className="notifications-list-container mt-1 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center p-2">
        <InputGroup className="w-75 me-3">
          <InputGroup.Text><FontAwesomeIcon icon={faSearch} /></InputGroup.Text>
          <FormControl placeholder="Search Notifications" onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Form.Check
          className="unread-check"
          type="switch"
          id="unread-switch"
          label="Unread Only"
          checked={isUnread}
          onChange={handleSetUnread}
        />
        <Button className="mark-all-read" onClick={() => markAllReadNotifications()}>
          Mark all read
        </Button>
      </Card.Header>

      <Card.Body>
        <div className="message-list" ref={scrollContainerRef} style={{ maxHeight: "400px", overflowY: "auto" }}>
          {Object.values(groupedNotifications).every(group => group.length === 0) ? (
            <div className="text-center text-muted">No Data Available</div>
          ) : (
            Object.entries(groupedNotifications).map(([group, groupItems]) => (
              groupItems.length > 0 && (
                <div key={group}>
                  <h6 className="fw-bold">
                    {group === "today" ? "Today" : group === "yesterday" ? "Yesterday" : "Older"}
                  </h6>
                  <ListGroup variant="flush">
                    {groupItems.map((notif) => {
                      const isNotificationUnread = !notif?.status?.includes?.(userDetails?.adminUserId);
                      const isSelected = selectedNotificationId === notif.id;

                      return (
                        <ListGroup.Item
                          key={notif.id}
                          className="d-flex align-items-center"
                          style={{ backgroundColor: isNotificationUnread ? "#E4E0E1" : "#ffffff", margin: "5px" }}
                        >
                          <div className="flex-grow-1" onClick={() => isNotificationUnread && markReadNotifications?.(notif.id)}>
                            <strong>{notif.title}</strong>
                            <span className="time-text text-muted ms-2">{getTimeDifference(notif.createdAt)}</span>
                            <p className="notification-message mb-0 text-muted">{notif.message}</p>

                            <div
                              className="notification-show-more mb-0 text-muted"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNotificationId(isSelected ? null : notif.id);
                                if (isNotificationUnread) markReadNotifications?.(notif.id);
                              }}
                            >
                              {isSelected ? "Show less" : "Show more"}
                            </div>

                            {isSelected && (
                              <NotificationDetail
                                notificationData={notif}
                                setShowNotificationDetails={() => setSelectedNotificationId(null)}
                              />
                            )}
                          </div>

                          {isNotificationUnread && (
                            <div className="d-flex flex-column align-items-end">
                              <Dropdown as={ButtonGroup} drop="end">
                                <Dropdown.Toggle className="notification-menu" variant="primary">
                                  <FontAwesomeIcon icon={faEllipsisVertical} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => markReadNotifications?.(notif.id)}>
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Mark as read
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          )}
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </div>
              )
            ))
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default NotificationList;
