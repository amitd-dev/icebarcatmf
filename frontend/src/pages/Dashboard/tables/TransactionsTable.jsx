import React, { useEffect, useMemo, useState } from 'react';
import { Row, Table, Accordion, Button } from '@themesberg/react-bootstrap';
import { totalTablesList, tableData } from '../constants';
import { InlineLoader } from '../../../components/Preloader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatPriceWithCommas } from '../../../utils/helper';
import DataVizPanel from "../components/DataVizPanel";

const TransactionTable = ({ accordionOpen, setAccordionOpen, t,
    transactionDataV2,
    transactionLoadingV2,
    //   transactionRefetchV2
}) => {
    const [view, setView] = useState("chart"); // "table" | "chart"
    const metricOptions = useMemo(() => {
        const map = totalTablesList['transactionDataKeys'] || {};
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
        return tableData.map((k) => Number(transactionDataV2?.[metricId]?.[k] ?? 0));
    }, [metricId, transactionDataV2]);



    return (
        <>
            <Row className='mt-4 dashboard-accordion-header' onClick={() => setAccordionOpen(!accordionOpen)} style={{ cursor: 'pointer' }}>
                <h5 className='accordian-heading'>
                    <span>{t(`headers.transactionDataKeys`)} {t('headers.data')}</span>
                    <span className="d-flex align-items-center gap-2">
                        <div className="dashboard-view-tabs dashboard-view-tabs--compact" onClick={(e) => e.stopPropagation()}>
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
                                disabled={transactionLoadingV2 || !transactionDataV2 || !Object.keys(transactionDataV2)?.length}
                            >
                                Chart
                            </button>
                        </div>
                        {accordionOpen ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronRight} />} 
                    </span>
                </h5>
            </Row>
            <Accordion activeKey={accordionOpen ? '0' : ''}>
                <Accordion.Item eventKey="0">
                    <Accordion.Body>
                        {accordionOpen && view === "chart" && (
                            <DataVizPanel
                                title="Transactions Data"
                                metricOptions={metricOptions}
                                selectedMetricId={metricId}
                                onChangeMetricId={setMetricId}
                                labels={vizLabels}
                                values={vizValues}
                                isLoading={transactionLoadingV2}
                                demoSeed="transactions"
                            />
                        )}

                        {accordionOpen && view === "table" && (
                        <div className='table-responsive dashboard-table'>
                            <Table size='sm' className='text-center dashboard-data-table'>
                                <thead>
                                    <tr>
                                        <th className='text-left dashboard-data-table__param'>
                                            {t('table.parameters')}
                                        </th>
                                        <th>{t('table.today')}</th>
                                        <th>{t('table.yesterday')}</th>
                                        <th>{t('table.monthToDate')}</th>
                                        <th>{t('table.lastMonth')}</th>
                                        <th>{t('table.tillDate')}</th>
                                        <th>{t('table.selectedDate')}</th>
                                    </tr>
                                </thead>

                                {<tbody>
                                    {transactionLoadingV2 ? (
                                        <tr><td colSpan={10}><InlineLoader /></td></tr>
                                    ) : transactionDataV2 && Object.keys(transactionDataV2)?.length ? (
                                        Object.keys(transactionDataV2)?.map((data, i) => {
                                            return (
                                                Object.keys(totalTablesList['transactionDataKeys']).includes(
                                                    data
                                                ) && (
                                                    <tr key={i}>
                                                        <td className='text-left dashboard-data-table__param'>
                                                            {t(totalTablesList['transactionDataKeys'][data])}
                                                        </td>
                                                        {tableData?.map((ele) => (
                                                            <td key={ele}>{formatPriceWithCommas(transactionDataV2?.[data]?.[ele] || 0)}</td>
                                                        ))}
                                                    </tr>
                                                )
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className='text-center text-danger'>
                                                No Data Found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>}
                            </Table>
                        </div>
                        )}
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </>
    );
};
export default TransactionTable;
