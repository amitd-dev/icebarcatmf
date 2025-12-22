import React, { useEffect, useMemo, useState } from "react";
import { Col, Row, Table, Button } from "@themesberg/react-bootstrap";
import { totalTablesList, tableData } from "../constants";
import { InlineLoader } from "../../../components/Preloader";
import { formatPriceWithCommas } from "../../../utils/helper";
import DataVizPanel from "../components/DataVizPanel";

const CustomerTable = ({

  t,
  customerDataV2,
  customerLoadingV2,
  playerType,
          // customerRefetchV2
          // customerRefetchV2
}) => {
  const [view, setView] = useState("chart"); // "table" | "chart"

  const customerKey = playerType !== "internal" ? "customerDataKeysV2" : "customerDataKeysInternal";
  const metricOptions = useMemo(() => {
    const map = totalTablesList[customerKey] || {};
    return Object.keys(map).map((key) => ({
      value: key,
      label: t(map[key]),
    }));
  }, [customerKey, t]);
  const [metricId, setMetricId] = useState(metricOptions?.[0]?.value || "");
  useEffect(() => {
    if (!metricId && metricOptions?.[0]?.value) setMetricId(metricOptions[0].value);
  }, [metricId, metricOptions]);

  const vizLabels = useMemo(() => {
    return tableData.map((k) => {
      if (k === "MONTH_TO_DATE") return "Month to date";
      if (k === "LAST_MONTH") return "Last month";
      if (k === "TILL_DATE") return "Till date";
      if (k === "CUSTOM") return "Selected date";
      if (k === "YESTERDAY") return "Yesterday";
      if (k === "TODAY") return "Today";
      return k;
    });
  }, []);

  const vizValues = useMemo(() => {
    if (!metricId) return [];
    return tableData.map((k) => Number(customerDataV2?.[metricId]?.[k] ?? 0));
  }, [customerDataV2, metricId]);

  return (
    <>
      <Row className="mt-4 dashboard-section-heading">
        <div className="dashboard-section-heading__row">
          <h5 className="mb-0">
            {t(`headers.customerDataKeys`)} {t("headers.data")}
          </h5>
          <div className="dashboard-view-tabs">
            <button
              type="button"
              className={`dashboard-view-tab ${view === "table" ? "is-active" : ""}`}
              onClick={() => setView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={`dashboard-view-tab ${view === "chart" ? "is-active" : ""}`}
              onClick={() => {
                setMetricId((prev) => prev || metricOptions?.[0]?.value || "");
                setView("chart");
              }}
              disabled={
                customerLoadingV2 ||
                !customerDataV2 ||
                !Object.keys(customerDataV2)?.length
              }
            >
              Chart
            </button>
          </div>
        </div>
      </Row>

        <hr className="dashboard-section-divider" />

        {view === "chart" && (
          <DataVizPanel
            title="Customers Data"
            metricOptions={metricOptions}
            selectedMetricId={metricId}
            onChangeMetricId={setMetricId}
            labels={vizLabels}
            values={vizValues}
            isLoading={customerLoadingV2}
            demoSeed="customers"
          />
        )}

        {view === "table" && (
        <div className="table-responsive dashboard-table">
          <Table size="sm" className="text-center dashboard-data-table">
            <thead>
              <tr>
                <th className="text-left dashboard-data-table__param">
                  {t("table.parameters")}
                </th>
                <th>{t("table.today")}</th>
                <th>{t("table.yesterday")}</th>
                <th>{t("table.monthToDate")}</th>
                <th>{t("table.lastMonth")}</th>
                <th>{t("table.tillDate")}</th>
                <th>{t("table.selectedDate")}</th>
              </tr>
            </thead>

            { (playerType !== "internal" ?
              <tbody>
                {customerLoadingV2 ? (
                  <tr>
                    <td colSpan={10}>
                      <InlineLoader />
                    </td>
                  </tr>
                ) : customerDataV2 && Object.keys(customerDataV2)?.length ? (
                  Object.keys(customerDataV2)?.map((data, i) => {
                    return (
                      Object.keys(
                        totalTablesList["customerDataKeysV2"]
                      ).includes(data) && (
                        <tr key={i}>
                          <td className="text-left dashboard-data-table__param">
                            {t(totalTablesList["customerDataKeysV2"][data])}
                          </td>
                          {tableData?.map((ele) => (
                            <td key={ele}>
                              {formatPriceWithCommas(
                                customerDataV2?.[data]?.[ele] || 0
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center text-danger">
                      No Data Found
                    </td>
                  </tr>
                )}
              </tbody>:
              (
                <tbody>
                {customerLoadingV2 ? (
                  <tr>
                    <td colSpan={10}>
                      <InlineLoader />
                    </td>
                  </tr>
                ) : customerDataV2 && Object.keys(customerDataV2)?.length ? (
                  Object.keys(customerDataV2)?.map((data, i) => {
                    return (
                      Object.keys(
                        totalTablesList["customerDataKeysInternal"]
                      ).includes(data) && (
                        <tr key={i}>
                          <td className="text-left dashboard-data-table__param">
                            {t(totalTablesList["customerDataKeysInternal"][data])}
                          </td>
                          {tableData?.map((ele) => (
                            <td key={ele}>
                              {formatPriceWithCommas(
                                customerDataV2?.[data]?.[ele] || 0
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center text-danger">
                      No Data Found
                    </td>
                  </tr>
                )}
              </tbody>
              )
            )}
          </Table>
        </div>
        )}
    </>
  );
};
export default CustomerTable;
