import React, { useEffect, useMemo, useState } from "react";
import { Row, Table, Button, Spinner } from "@themesberg/react-bootstrap";
import { totalTablesList, tableData } from "../constants";
import { InlineLoader } from "../../../components/Preloader";
import { formatPriceWithCommas } from "../../../utils/helper";
import DataVizPanel from "../components/DataVizPanel";

const LoginDataTable = ({
  reportLoading,
  reportData,
  t,
  reportTillData,
  reportTillLoading,
  reportTillRefetch,
  isReportTillRefetching,
}) => {
  const isTillBusy = reportTillLoading || isReportTillRefetching;
  const [view, setView] = useState("chart"); // "table" | "chart"
  const metricOptions = useMemo(() => {
    const map = totalTablesList["loginData"] || {};
    return Object.keys(map).map((key) => ({
      value: key,
      label: t(map[key]),
    }));
  }, [t]);
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
    return tableData.map((k) => {
      if (k === "TILL_DATE") return Number(reportTillData?.[metricId] ?? 0);
      return Number(reportData?.[metricId]?.[k] ?? 0);
    });
  }, [metricId, reportData, reportTillData]);



 
  

  
  return (
    <>
        <Row className="mt-4 dashboard-section-heading">
          <div className="dashboard-section-heading__row">
            <h5 className="mb-0">
              {t(`headers.loginData`)} {t("headers.data")}
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
                disabled={reportLoading || !reportData || !Object.keys(reportData)?.length}
              >
                Chart
              </button>
            </div>
          </div>
        </Row>
        <hr className="dashboard-section-divider" />

        {view === "chart" && (
          <DataVizPanel
            title="Login Data"
            metricOptions={metricOptions}
            selectedMetricId={metricId}
            onChangeMetricId={setMetricId}
            labels={vizLabels}
            values={vizValues}
            isLoading={reportLoading}
            demoSeed="login"
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

            <tbody>
  {reportLoading ? (
    <tr>
      <td colSpan={10}>
        <InlineLoader />
      </td>
    </tr>
  ) : reportData && Object.keys(reportData)?.length ? (
    Object.keys(reportData)?.map((data, i) => {
      return (
        Object.keys(totalTablesList["loginData"]).includes(data) && (
          <tr key={i}>
            <td className="text-left dashboard-data-table__param">
              {t(totalTablesList["loginData"][data])}
            </td>
            {tableData?.map((ele) => (
             <td key={ele}>
             {ele === 'TILL_DATE' ? (
               reportTillData?.[data] ? (
                 formatPriceWithCommas(reportTillData[data])
               ) : (
                 <Button
                   className="dashboard-table__action-btn"
                   onClick={() => reportTillRefetch()}
                   disabled={isTillBusy}
                 >
                   {isTillBusy ? (
                     <>
                       Loading
                       <Spinner
                         as="span"
                         animation="border"
                         size="sm"
                         role="status"
                         aria-hidden="true"
                       />
                     </>
                   ) : (
                     "Show"
                   )}
                 </Button>
               )
             ) : (
               formatPriceWithCommas(reportData?.[data]?.[ele] || 0)
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


          </Table>
        </div>
        )}
    </>
  );
};
export default LoginDataTable;
