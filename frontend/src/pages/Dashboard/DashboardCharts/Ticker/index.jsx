import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button, Form as BForm, Modal } from "@themesberg/react-bootstrap";
import { formatNumber } from "../../../../utils/dateFormatter";
import { getLoginToken, getItem, setItem } from "../../../../utils/storageUtils";
import { loginCountSocket } from "../../../../utils/socket";
import { useUserStore } from "../../../../store/store";

const DEFAULT_TICKER_SLOTS = [
  "onlinePlayers",
  "activePlayers",
  "totalWalletSc",
  "totalVaultSc",
  "overallRedemptionRate",
  "todayRedemptionRate",
];

const ALL_TICKER_TILE_IDS = [
  // existing bottom 6
  ...DEFAULT_TICKER_SLOTS,
  // “favorites” users can swap in (from the top KPI tiles)
  "todayScStaked",
  "todayScWins",
  "todayGgrSc",
  "scAwardedTotal",
  "gcAwardedTotal",
  "todayNetGgrSc",
  "jackpotRevenue",
];

const getTickerSlotsStorageKey = (userKey) =>
  `dashboard:tickerSlots:${userKey || "anonymous"}`;

const safeParseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeSlots = (slots) => {
  if (!Array.isArray(slots) || slots.length !== 6) return DEFAULT_TICKER_SLOTS;

  const valid = slots.filter((id) => ALL_TICKER_TILE_IDS.includes(id));
  if (valid.length !== 6) return DEFAULT_TICKER_SLOTS;

  // Ensure uniqueness; if duplicates exist, fill missing with defaults.
  const unique = [];
  for (const id of valid) {
    if (!unique.includes(id)) unique.push(id);
  }
  const missing = DEFAULT_TICKER_SLOTS.filter((id) => !unique.includes(id));
  return [...unique, ...missing].slice(0, 6);
};

export const Ticker = ({ data }) => {
  const [loginCount, setLoginCount] = useState(0);
  const [livePlayersCount, setLivePlayersCount] = useState(0);
  const [vaultSc, setVaultSc] = useState(0);
  const [walletSc, setWalletSc] = useState(0);
  const [slotTileIds, setSlotTileIds] = useState(DEFAULT_TICKER_SLOTS);
  const [replaceModal, setReplaceModal] = useState({
    isOpen: false,
    slotIndex: null,
    selectedTileId: "",
  });
  // const labelList = loginData.find(
  //   (data) => data?.label === "loginKeys.CURRENT_LOGIN"
  // ).total;

  const loginCountSocketConnection = useUserStore(
    (state) => state.loginCountSocketConnection
  );
  const livePlayersCountConnection = useUserStore(
    (state) => state.livePlayersCountConnection
  );

  const userKey = useMemo(() => {
    // Admin login stores adminUsername in localStorage('userId')
    const token = getLoginToken();
    if (token) return token;
    // Fallback
    return getItem("userId") || "anonymous";
  }, []);

  const loginCountSocketData = (data) => {
    setLoginCount(data);
  };

  const livePlayersCountSocketData = (data) => {
    setLivePlayersCount(data);
  };

  // Perf: socket can fire very frequently; throttle state updates to keep CPU/GPU cool.
  const lastApplyAtRef = useRef(0);
  const pendingPayloadRef = useRef(null);
  const throttleTimerRef = useRef(null);
  const isVisibleRef = useRef(true);
  const lowPowerRef = useRef(false);
  const applyLivePayload = (payload) => {
    const nextWallet = Math.round((Number(payload?.totalScCoin ?? 0) || 0) * 100) / 100;
    const nextVault = Math.round((Number(payload?.totalVaultScCoin ?? 0) || 0) * 100) / 100;
    setWalletSc((prev) => (prev === nextWallet ? prev : nextWallet));
    setVaultSc((prev) => (prev === nextVault ? prev : nextVault));
    if (loginCountSocketConnection) {
      const nextLogin = Number(payload?.liveLoginCount ?? 0) || 0;
      setLoginCount((prev) => (prev === nextLogin ? prev : nextLogin));
    }
    if (livePlayersCountConnection) {
      const nextLive = Number(payload?.liveGamePlayCount ?? 0) || 0;
      setLivePlayersCount((prev) => (prev === nextLive ? prev : nextLive));
    }
  };

  useEffect(() => {
    const stored = safeParseJson(
      getItem(getTickerSlotsStorageKey(userKey)),
      null
    );
    setSlotTileIds(normalizeSlots(stored));
  }, [userKey]);

  useEffect(() => {
    setItem(getTickerSlotsStorageKey(userKey), JSON.stringify(slotTileIds));
  }, [slotTileIds, userKey]);

  useEffect(() => {
    if (!loginCountSocketConnection && !livePlayersCountConnection) return;

    lowPowerRef.current =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("gs-low-power");

    const onVis = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    const handler = (payload) => {
      if (!isVisibleRef.current) return;
      // Throttle to ~2 updates/sec to avoid constant re-rendering.
      pendingPayloadRef.current = payload;
      if (throttleTimerRef.current) return;
      const now = Date.now();
      const elapsed = now - lastApplyAtRef.current;
      // In low-power mode, reduce further to ~1 update/sec.
      const interval = lowPowerRef.current ? 1000 : 500;
      const delay = Math.max(0, interval - elapsed);
      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
        if (!isVisibleRef.current) return;
        lastApplyAtRef.current = Date.now();
        const p = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        applyLivePayload(p);
      }, delay);
    };

    loginCountSocket.on("COMBINED_LIVE_UPDATE", handler);
    return () => {
      loginCountSocket.off("COMBINED_LIVE_UPDATE", handler);
      document.removeEventListener("visibilitychange", onVis);
      if (throttleTimerRef.current) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [loginCountSocketConnection, livePlayersCountConnection]);
  const formattedVaultData =
    Math.round(data?.DASHBOARD_REPORT?.totalVaultScCoin * 100) / 100;
  const formattedWalletData =
    Math.round(data?.DASHBOARD_REPORT?.totalWalletScCoin * 100) / 100;

  const tileDefs = useMemo(
    () => ({
      onlinePlayers: {
        id: "onlinePlayers",
        label: "Online Players",
        icon: "/online-players.png",
        className: "online",
        formatValue: () =>
          formatNumber(
            loginCount ? loginCount : data?.DASHBOARD_REPORT?.currentLogin || 0
          ),
      },
      activePlayers: {
        id: "activePlayers",
        label: "Active Players",
        icon: "/active-players.png",
        className: "active",
        formatValue: () =>
          formatNumber(
            livePlayersCount
              ? livePlayersCount
              : data?.DASHBOARD_REPORT?.activePlayersCount || 0
          ),
      },
      totalWalletSc: {
        id: "totalWalletSc",
        label: "Total Wallet SC",
        icon: "/total-wallet-sc.png",
        className: "total-wallet",
        formatValue: () =>
          formatNumber(
            Math.round(
              ((walletSc ? walletSc : data ? formattedWalletData : 0) || 0) * 100
            ) / 100
          ),
      },
      totalVaultSc: {
        id: "totalVaultSc",
        label: "Total Vault SC",
        icon: "/total-vault-sc.png",
        className: "total-vault",
        formatValue: () =>
          formatNumber(
            Math.round(
              ((vaultSc ? vaultSc : data ? formattedVaultData : 0) || 0) * 100
            ) / 100
          ),
      },
      overallRedemptionRate: {
        id: "overallRedemptionRate",
        label: "Overall Redemption Rate",
        icon: "/overall-rate.png",
        className: "overall",
        formatValue: () =>
          `${data?.DASHBOARD_REPORT?.redemptionRateOverall || 0}%`,
      },
      todayRedemptionRate: {
        id: "todayRedemptionRate",
        label: "Today Redemption Rate",
        icon: "/today-rate.png",
        className: "today",
        formatValue: () => `${data?.DASHBOARD_REPORT?.redemptionRateToday || 0}%`,
      },

      // “Favorite” swappable KPI tiles (from MultiChartContainer)
      todayScStaked: {
        id: "todayScStaked",
        label: "Today SC Staked",
        icon: "/total-sc-staked.svg",
        className: "sc-stack",
        formatValue: () =>
          formatNumber(data?.DASHBOARD_REPORT?.scStakedTodayCount || 0),
      },
      todayScWins: {
        id: "todayScWins",
        label: "Today SC Wins",
        icon: "/today-sc-wins.svg",
        className: "sc-win",
        formatValue: () =>
          formatNumber(data?.DASHBOARD_REPORT?.scWinTodayCount || 0),
      },
      todayGgrSc: {
        id: "todayGgrSc",
        label: "Today GGR SC",
        icon: "/total-ggr-sc.svg",
        className: "scr-sc",
        formatValue: () => formatNumber(data?.DASHBOARD_REPORT?.scGgr || 0),
      },
      scAwardedTotal: {
        id: "scAwardedTotal",
        label: "SC Awarded Total",
        icon: "/sc-awarded-total.svg",
        className: "usc-balance",
        formatValue: () =>
          formatNumber(data?.DASHBOARD_REPORT?.scAwardedTotalSumForToday || 0),
      },
      gcAwardedTotal: {
        id: "gcAwardedTotal",
        label: "GC Awarded Total",
        icon: "/gc-awarded-total.svg",
        className: "rsc-balance",
        formatValue: () =>
          formatNumber(data?.DASHBOARD_REPORT?.gcAwardedTotalSumForToday || 0),
      },
      todayNetGgrSc: {
        id: "todayNetGgrSc",
        label: "Today Net GGR SC",
        icon: "/total-net-ggr-sc.svg",
        className: "ggrsc-balance",
        formatValue: () => formatNumber(data?.DASHBOARD_REPORT?.netScGgr || 0),
      },
      jackpotRevenue: {
        id: "jackpotRevenue",
        label: "Jackpot Revenue",
        icon: "/jackpot-revenue.svg",
        className: "sc-jackpot",
        formatValue: () => formatNumber(data?.DASHBOARD_REPORT?.jackpotRevenue || 0),
      },
    }),
    [
      data,
      formattedVaultData,
      formattedWalletData,
      livePlayersCount,
      loginCount,
      livePlayersCountConnection,
      loginCountSocketConnection,
      vaultSc,
      walletSc,
    ]
  );

  const openReplaceModal = (slotIndex) => {
    const currentTileId = slotTileIds[slotIndex];
    setReplaceModal({
      isOpen: true,
      slotIndex,
      selectedTileId: currentTileId,
    });
  };

  const closeReplaceModal = () => {
    setReplaceModal({ isOpen: false, slotIndex: null, selectedTileId: "" });
  };

  const handleSaveReplace = () => {
    const { slotIndex, selectedTileId } = replaceModal;
    if (slotIndex == null || !selectedTileId) return closeReplaceModal();

    setSlotTileIds((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex((id) => id === selectedTileId);
      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        // Swap to keep uniqueness.
        const temp = next[slotIndex];
        next[slotIndex] = next[existingIndex];
        next[existingIndex] = temp;
        return next;
      }
      next[slotIndex] = selectedTileId;
      return normalizeSlots(next);
    });

    closeReplaceModal();
  };

  const handleResetDefaults = () => {
    setSlotTileIds(DEFAULT_TICKER_SLOTS);
    closeReplaceModal();
  };

  const usedIds = new Set(slotTileIds);
  const replaceOptions = ALL_TICKER_TILE_IDS;

  return (
    <>
      <div className="ticker-wrapper w-100 p-2">
        {slotTileIds.map((tileId, idx) => {
          const tile = tileDefs[tileId];
          if (!tile) return null;
          return (
            <div key={`${tileId}-${idx}`} className={`ticker-container ${tile.className}`}>
              <button
                type="button"
                className="ticker-replace-btn"
                aria-label="Replace tile"
                title="Replace tile"
                onClick={() => openReplaceModal(idx)}
              >
                <img src="/copy-svgrepo-com.svg" alt="" />
              </button>
          <div className="ticker-today-loginC">
            <div className="ticker-label">
                  <img src={tile.icon} />
                  <label>{tile.label}</label>
            </div>
            <div className="ticket-todayC">
                  <p>{tile.formatValue()}</p>
          </div>
        </div>
            </div>
          );
        })}
        </div>

      <Modal
        show={replaceModal.isOpen}
        onHide={closeReplaceModal}
        centered
        className="ticker-replace-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Replace tile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BForm.Group>
            <BForm.Label>Select a tile</BForm.Label>
            <BForm.Select
              value={replaceModal.selectedTileId}
              onChange={(e) =>
                setReplaceModal((prev) => ({
                  ...prev,
                  selectedTileId: e.target.value,
                }))
              }
            >
              {replaceOptions.map((id) => {
                const inUseIndex = slotTileIds.findIndex((x) => x === id);
                const isInUseElsewhere =
                  replaceModal.slotIndex != null &&
                  inUseIndex !== -1 &&
                  inUseIndex !== replaceModal.slotIndex;
                return (
                  <option key={id} value={id}>
                    {(tileDefs[id]?.label || id) +
                      (isInUseElsewhere ? " (in use)" : "")}
                  </option>
                );
              })}
            </BForm.Select>
          </BForm.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="outline-secondary" onClick={handleResetDefaults}>
            Reset defaults
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={closeReplaceModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveReplace}>
              Save
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Ticker;
