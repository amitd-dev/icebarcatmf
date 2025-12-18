import { Row, Table, Accordion } from '@themesberg/react-bootstrap';
import { totalTablesList, tableData } from '../constants';
import { InlineLoader } from '../../../components/Preloader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatPriceWithCommas } from '../../../utils/helper';

const TransactionTable = ({ accordionOpen, setAccordionOpen, t,
    transactionDataV2,
    transactionLoadingV2,
    //   transactionRefetchV2
}) => {



    return (
        <>
            <Row className='mt-4 dashboard-accordion-header' onClick={() => setAccordionOpen(!accordionOpen)} style={{ cursor: 'pointer' }}>
                <h5 className='accordian-heading'>
                    <span>{t(`headers.transactionDataKeys`)} {t('headers.data')}</span>
                    <span>{accordionOpen ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronRight} />} </span>
                </h5>
            </Row>
            <Accordion activeKey={accordionOpen ? '0' : ''}>
                <Accordion.Item eventKey="0">
                    <Accordion.Body>
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
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </>
    );
};
export default TransactionTable;
