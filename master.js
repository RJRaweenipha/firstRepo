import utils from '/site/js/utils.js';

export default socket => {

    const updateDateButton = document.getElementById("updateDateButton");
    const fromDateDatepicker = document.getElementById("fromDate");
    const toDateDatepicker = document.getElementById("toDate");
    const alertText = document.getElementById("alertText");

    var date = new Date();
    var previousMonth = new Date().getMonth();
    var currentYear = new Date().getFullYear();

    var numberOfPreviousMonthDate = utils.getNumberOfDateInMonth(previousMonth, currentYear);
    var dateOfPreviousMonth = new Date(new Date().setDate(date.getDate() - numberOfPreviousMonthDate));
    var dateOfPreviousMonthMilliSec = dateOfPreviousMonth.setHours(0, 0, 0, 0);
    var currentDateMilliSec = date.setHours(23, 59, 59, 999);
    var clientType = 'All';
    var fromDateDisplay = convertFormatDate(dateOfPreviousMonth);
    var toDateDisplay = convertFormatDate(date);

    var today = convertFormatDate(date);
    fromDateDatepicker.setAttribute("max", today);
    toDateDatepicker.setAttribute("max", today);
    fromDateDatepicker.value = fromDateDisplay;
    toDateDatepicker.value = toDateDisplay;

    function convertFormatDate(date) {
        var year = date.toLocaleString("default", { year: "numeric" });
        var month = date.toLocaleString("default", { month: "2-digit" });
        var day = date.toLocaleString("default", { day: "2-digit" });
        var formatDate = year + "-" + month + "-" + day;

        return formatDate;
    }
    function socket_connect() {
        console.log('dashboard connected.');
        createSummaryCustomerDashboard();
        createCustomerPerAgentDashboard();
        // createRangingResponseTimeDashboard(dateOfPreviousMonthMilliSec, currentDateMilliSec);
        // createTrendReceivedCaseDashboard(dateOfPreviousMonthMilliSec, currentDateMilliSec);
        getResponseTimeAndResolvedCase(dateOfPreviousMonthMilliSec, currentDateMilliSec, clientType);
        utils.loading(".loadingContainer", false);
        showOptionLineAccount();
    }
    function socket_disconnect() {
        console.log('dashboard disconnected.');
    }
    function init(data, io) {
        if (data) {
            window.data = data;
        }
        if (io) {
            socket = io;
        }
        socket.on('connected', socket_connect);
        socket.on('disconnect', socket_disconnect);
    }
    init();

    const dashboardContainer = document.querySelector('.dashboardContainer');

    function unload() {
        socket.disconnect();
        socket = null;
        console.log('dashboard disconnected.');
    }
    function createSummaryCustomerDashboard() {
        socket.emit('get summary customers', result => {
            if (result.error) {
                return;
            }
            var tbody = dashboardContainer.querySelector('.summaryChannelDashboard table tbody');

            tbody.innerHTML = '';

            const newTitle = (title, count) => {
                var row = utils.newElement('tr');
                var name = utils.newElement('td', { class: 'name' });
                var number = utils.newElement('td', { class: 'number' });

                name.innerText = title;
                number.innerText = count;

                row.appendChild(name);
                row.appendChild(number);
                tbody.appendChild(row);
            }
            newTitle('All Customers: ', result.allCount || 0);
            newTitle('Assigned Agents: ', result.assignedAgentCount || 0);
            newTitle('Un-assigned Agents: ', result.unassignedAgentCount || 0);
            newTitle('Resolved customers: ', result.resolvedCount || 0);
            newTitle('Unread customers: ', result.unreadCount || 0);
        });
    }
    function createCustomerPerAgentDashboard() {
        socket.emit('get agent information', result => {
            if (!!!result || result.error) {
                return;
            }
            try {
                var tbody = dashboardContainer.querySelector('.customerPerAgentDashboard table tbody');
                tbody.innerHTML = '';
                result.sort(function (a, b) { return (a.online === b.online) ? 0 : a ? -1 : 1; });

                result.forEach(a => {

                    var row = utils.newElement('tr', a.online ? { class: 'online' } : null);
                    var name = utils.newElement('td', { class: 'name' });
                    var online = utils.newElement('td', { class: 'online' });
                    var channels = utils.newElement('td', { class: 'number' });
                    var status = utils.newElement('td', { class: 'status' });

                    name.innerText = a.name;
                    online.innerText = a.online ? '\u2714' : '\u2716';
                    status.innerText = a.status ? a.status : '';
                    channels.innerText = a.channels;

                    row.appendChild(name);
                    row.appendChild(online);
                    row.appendChild(status);
                    row.appendChild(channels);
                    tbody.appendChild(row);

                    socket.emit('get resepond time report by user id', a.id, reportResult => {
                        getCustomer(reportResult);
                    });
                    function getCustomer(respondData) {
                        if (respondData.Items != "") {
                            var maxDate = new Date(Math.max(...(respondData.Items).map(e => new Date(e.dateCreated))));
                            var lastReportData = (respondData.Items).find(item => item.dateCreated == maxDate.getTime());

                            var customer = utils.newElement('td', { class: 'customer' });
                            customer.innerText = lastReportData.customerName;
                            row.appendChild(customer);

                        } else {
                            var customer = utils.newElement('td', { class: 'customer' });
                            customer.innerText = "";
                            row.appendChild(customer);
                        }

                    }


                });
            } catch (e) {
                console.log('can not create Customer Per Agent Dashboard.', e);
            }
        });
    }

    function showOptionLineAccount() {
        const chooseClient = document.getElementById("chooseClient");
        socket.emit('getLineAccounts', result => {
            if (result.length > 0) {
                for (var value of result) {
                    chooseClient.options[chooseClient.options.length] = new Option(value, value);
                }
            }
        });
    }
    updateDateButton.addEventListener("click", () => {
        utils.loading(".loadingContainer");
        const chooseClient = document.getElementById("chooseClient");
        var clientType = chooseClient.options[chooseClient.selectedIndex].text;
        if (fromDateDatepicker.value && toDateDatepicker.value) {
            if (fromDateDatepicker.value > toDateDatepicker.value) {
                alertText.style.display = "block";
                alertText.style.visibility = "visible";
            }
            else {
                var fromDateMillisec = new Date(fromDate.value).setHours(0, 0, 0, 0);
                var toDateMillisec = new Date(toDate.value).setHours(23, 59, 59, 999);
                // createRangingResponseTimeDashboard(fromDateMillisec, toDateMillisec);
                // createTrendReceivedCaseDashboard(fromDateMillisec, toDateMillisec);
                getResponseTimeAndResolvedCase(fromDateMillisec, toDateMillisec, clientType);
                utils.loading(".loadingContainer", false);
            }
        } else {
            // createRangingResponseTimeDashboard(dateOfPreviousMonthMilliSec, currentDateMilliSec);
            // createTrendReceivedCaseDashboard(dateOfPreviousMonthMilliSec, currentDateMilliSec);
            getResponseTimeAndResolvedCase(dateOfPreviousMonthMilliSec, currentDateMilliSec, clientType);
            utils.loading(".loadingContainer", false);

        }
    });


    document.getElementById("closeAlert").addEventListener("click", () => {
        alertText.style.display = "none";
    });
    // const serviceNameSelect = document.getElementById("serviceName");
    function getResponseTimeAndResolvedCase(fromDate, toDate, clientType) {
        var dataResolvedCase = { fromDate: fromDate, toDate: toDate, clientType: clientType, reportName: "ResolvedCase" }
        var dataResponseTimeCase = { fromDate: fromDate, toDate: toDate, reportName: "ResponseTime" }
        var ResolvedReportData;
        var ticketAll;
        var ResponseTimeReportData;
        var ResolvedCaseDashboards;
        socket.emit('getReportFromDateToDate', dataResolvedCase, result => {
            if (result.error) {
                return;
            }
            if (result.Items) {
                ticketAll = result.Count;
                ResolvedReportData = result.Items.filter(report => report.serviceTopic !== 'ไม่ต้องตอบกลับ' && report.serviceTopic !== "599871e8-4863-4925-aadf-9ed7d2a1ab26"
                    && report.serviceTopic !== "1c5a82f4-fca6-46f8-aa3f-a80eb11d65be" && report.serviceTopic !== "e63bc28d-3814-4f7c-8275-45ef61397eca" && report.serviceTopic !== "fec1a87c-47c5-4219-b01a-01b3c3b8225a");
            }
            socket.emit('get response time report', dataResponseTimeCase, result => {
                if (result.error) {
                    return;
                }
                if (result.Items) {
                    ResponseTimeReportData = result.Items;
                    createRangingResponseTimeDashboard(ResolvedReportData, ResponseTimeReportData);
                    createTrendReceivedCaseDashboard(ResolvedReportData, ResponseTimeReportData);
                    showAveragePercentTotalTicket(ResolvedReportData, ResponseTimeReportData, ticketAll);
                }
                if (clientType === 'All') {
                    var dataResolvedCaseDashboards = { fromDate: fromDate, toDate: toDate, title: "ResolvedCaseDashboards" }
                    socket.emit('getResolvedCaseDashboardsTitle', dataResolvedCaseDashboards, result => {
                        if (result.error) {
                            return;
                        }
                        if (result.Items) {
                            ResolvedCaseDashboards = result.Items;
                            showTableResolvedCaseData(ResolvedCaseDashboards);
                            exportReports(ResolvedReportData, ResolvedCaseDashboards);
                        }
                    });
                }
                else {
                    var dataResolvedCaseDashboardsClientType = { fromDate: fromDate, toDate: toDate, clientType: clientType }
                    socket.emit('getResolvedCaseDashboardsClientType', dataResolvedCaseDashboardsClientType, result => {
                        if (result.error) {
                            return;
                        }
                        if (result.Items) {
                            ResolvedCaseDashboards = result.Items;
                            showTableResolvedCaseData(ResolvedCaseDashboards);
                            exportReports(ResolvedReportData, ResolvedCaseDashboards);
                        }
                    });
                }
            });
        });
    }
    function createRangingResponseTimeDashboard(ResolvedReportData, ResponseTimeReportData) {
        var reponseTimeData = calculateResponseTime(ResolvedReportData, ResponseTimeReportData);
        var dataSet = [];
        const count1To10 = (reponseTimeData.filter(reponseTime => (reponseTime <= 10))).length;
        const count11To20 = (reponseTimeData.filter(reponseTime => (reponseTime > 10 && reponseTime <= 20))).length;
        const count21To30 = (reponseTimeData.filter(reponseTime => (reponseTime > 20 && reponseTime <= 30))).length;
        const count31To40 = (reponseTimeData.filter(reponseTime => (reponseTime > 30 && reponseTime <= 40))).length;
        const count41To50 = (reponseTimeData.filter(reponseTime => (reponseTime > 40 && reponseTime <= 50))).length;
        const count51To60 = (reponseTimeData.filter(reponseTime => (reponseTime > 50 && reponseTime <= 60))).length;
        const countMoreThan61 = (reponseTimeData.filter(reponseTime => (reponseTime >= 61))).length;
        dataSet.push(countMoreThan61);
        dataSet.push(count51To60);
        dataSet.push(count41To50);
        dataSet.push(count31To40);
        dataSet.push(count21To30);
        dataSet.push(count11To20);
        dataSet.push(count1To10);
        const labels = [['>60 Sec.'], '51-60 Sec.', '41-50 Sec.', '31-40 Sec.', '21-30 Sec.', '11-20  Sec.', '0-10 Sec.'];
        const data = {
            labels: labels,
            datasets: [{
                label: 'Number of Cases',
                data: dataSet,
                backgroundColor: [
                    'rgba(90,155,213)'
                ],
                borderColor: [
                    'rgb(201, 203, 207)'
                ],
                borderWidth: 1
            }]
        };
        const config = {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: data,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scale: {
                    ticks: {
                        precision: 0,
                        stepSize: 50
                    }

                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Ranging response time',
                        font: {
                            size: 24
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'right',
                        color: ' rgb(0,0,0)',
                        font: {
                            size: 14

                        }
                    }
                }

            }
        };
        const div = document.getElementById('rangingResponseTimePart');
        while (div.firstChild) {
            div.removeChild(div.lastChild);
        }
        var canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'rangingResponseTimeChart');
        div.append(canvas);

        var ctx = document.getElementById('rangingResponseTimeChart');
        var myChart = new Chart(ctx, config)

    }

    function createTrendReceivedCaseDashboard(ResolvedReportData, ResponseTimeReportData) {

        const resolvedCaseData = ResolvedReportData.sort((a, b) => a.dateCreated - b.dateCreated);
        var resolvedDate = [];
        var dateDisplay = [];
        // find all of cases was resolved on what date. 
        // IF all of date have 2022-10-1, 2022-10-1, 2022-10-2 and 2022-10-3 THEN resolvedDate = [ 2022-10-1, 2022-10-2, 2022-10-3]
        for (let i = 0; i < resolvedCaseData.length; i++) {
            // let newDate = ;
            let dateCreatedISO = new Date(resolvedCaseData[i].dateCreated).toISOString();
            let date = dateCreatedISO.split('T')[0]; //date format be like 2022-10-21
            // prepareDateDisplay(date);
            if (resolvedDate.indexOf(date) < 0) {
                resolvedDate.push(date);
            }
        }
        resolvedDate.forEach(item => prepareDateDisplay(item))
        function prepareDateDisplay(date) {
            // parameter: date format must be as yyyy-mm-dd
            let splitDate = date.split('-')[2];
            let result = splitDate > 9 ? splitDate : splitDate.split('0')[1];
            dateDisplay.push(result);
        }

        // seperate resolved case follow by dateCreated
        // then push number of cases each date in array dataset (resolvedCaseEachDate)
        var groupsresolved = {};
        var resolvedCaseEachDate = [];
        resolvedCaseData.forEach(function (val) {
            let dateCreatedISO = new Date(val.dateCreated).toISOString();
            let dateCreated = dateCreatedISO.split('T')[0];
            if (dateCreated in groupsresolved) {
                groupsresolved[dateCreated].push(val);
            } else {
                groupsresolved[dateCreated] = new Array(val);
            }
        });
        for (let i = 0; i < resolvedDate.length; i++) {
            var numDate = resolvedDate[i];
            const numDay = groupsresolved[numDate] == undefined ? 0 : groupsresolved[numDate].length;
            resolvedCaseEachDate.push(numDay);
        }
        // filter use only message from case resolved 
        var userList = [];
        resolvedCaseData.forEach(data => {
            if (checkHaveUser(data.customerId) === false) {
                userList.push(data.customerId);
            }
        });
        function checkHaveUser(data) {
            return userList.some(item => item === data);
        }
        var resolvedDataOfUsers = [];
        userList.forEach(customerId => {
            let resolvedFilter = resolvedCaseData.filter(resolved => resolved.customerId == customerId);
            resolvedDataOfUsers.push(resolvedFilter);
        });
        var cases = [];
        // loop follow resolved case of each user : ex. [[caseA1, caseA2], [caseB1, caseB2,caseB3]]
        for (let i = 0; i < resolvedDataOfUsers.length; i++) {
            let length = resolvedDataOfUsers[i].length;
            // loop follow resolved case of each user : ex. [caseA1, caseA2]
            for (let j = 0; j < length; j++) {
                let responseDataOfUser = ResponseTimeReportData.filter(user => user.customerId == resolvedDataOfUsers[i][j].customerId);
                if (j === 0) {
                    let filter = responseDataOfUser.filter(res => res.dateCreated < resolvedDataOfUsers[i][j].dateCreated && res.customerId === resolvedDataOfUsers[i][j].customerId);
                    resolvedDataOfUsers[i][j]["response"] = filter;
                } else {
                    let filter = responseDataOfUser.filter(res => (resolvedDataOfUsers[i][j - 1].dateCreated < res.dateCreated && res.dateCreated < resolvedDataOfUsers[i][j].dateCreated) && res.customerId === resolvedDataOfUsers[i][j].customerId);
                    resolvedDataOfUsers[i][j]["response"] = filter;
                }
                cases.push(resolvedDataOfUsers[i][j]);
            }
        }
        // // then separate messages follow by dateCreated and calc avg of each case
        var groupsresponseTime = {};
        cases.forEach(function (c) {
            let dateCreatedISO = new Date(c.dateCreated).toISOString();
            let dateCreated = dateCreatedISO.split('T')[0];
            let sumOfResponseTime = 0;
            let avg = 0;
            //some cases dont have messages(cuz testing by just reslove) then we should check first if dont have any msg responsetime = 0
            if ((c.response).length > 0) {
                (c.response).forEach(item => {
                    sumOfResponseTime += item.responseTime / 1000;
                });
                avg = sumOfResponseTime / (c.response).length;
            } else {
                sumOfResponseTime = 0;
                avg = 0;
            }
            if (dateCreated in groupsresponseTime) {
                groupsresponseTime[dateCreated].push(avg.toString());
            } else {
                groupsresponseTime[dateCreated] = new Array(avg.toString());
            }

        });
        // // and calculate response time avg each date 
        let responseTime;
        let secResponseTime = 0;
        let sumResponseTime = 0;
        var averageResponseTime = [];
        for (let i = 0; i < resolvedDate.length; i++) {
            var numDate = resolvedDate[i];

            // check date case in groupsresponseTime
            const numResponseTime = groupsresponseTime[numDate] == undefined ? 0 : groupsresponseTime[numDate].length; // keep num responseTime of days
            const numCase = groupsresponseTime[numDate] == undefined ? 0 : groupsresolved[numDate].length;

            for (let j = 0; j < numResponseTime; j++) {
                responseTime = parseInt(groupsresponseTime[numDate][j]);
                sumResponseTime += responseTime;

            }
            if (groupsresponseTime[numDate]) {
                var sec = sumResponseTime / numCase;
                secResponseTime = Math.round(sec);
            }
            else {
                secResponseTime = 0;
            }
            averageResponseTime.push(secResponseTime);

            sumResponseTime = 0;
            secResponseTime = 0;
        }
        const data = {
            labels: dateDisplay,
            datasets: [
                {
                    label: 'Case',
                    data: resolvedCaseEachDate,
                    borderColor: 'rgb(110, 141, 254)',
                    backgroundColor: 'rgb(142, 190, 254)',
                },
                {
                    label: 'Response Time(Sec.)',
                    data: averageResponseTime,
                    borderColor: 'rgb(255, 171, 44)',
                    backgroundColor: 'rgb(255, 205, 102)',
                }
            ]
        };
        const config = {
            type: 'line',
            plugins: [ChartDataLabels],
            data: data,
            options: {
                indexAxis: 'x',
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scale: {
                    ticks: {
                        precision: 0,
                        stepSize: 50
                    }

                },
                stacked: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Trend Received Case & Response Time',
                        font: {
                            size: 24
                        }
                    },
                }
            },
        };
        const div = document.getElementById('trendReceivedCasePart');
        while (div.firstChild) {
            div.removeChild(div.lastChild);
        }
        var canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'trendReceivedCaseChart');
        div.append(canvas);
        const ctx = document.getElementById('trendReceivedCaseChart');
        var myChart = new Chart(ctx, config);
    }
    function showAveragePercentTotalTicket(ResolvedReportData, ResponseTimeReportData, ticketAll) {
        var reponseTimeData = calculateResponseTime(ResolvedReportData, ResponseTimeReportData);
        let sumResponseTime = 0;
        for (let i = 0; i < reponseTimeData.length; i++) {
            sumResponseTime += reponseTimeData[i];
        }
        var showAverageResponse = document.getElementById('averageResponse');
        let averageReponseTime = Math.round(sumResponseTime / reponseTimeData.length);
        let averageTotalReponseTime = averageReponseTime ? Math.round(averageReponseTime) : 0;
        showAverageResponse.innerHTML = averageTotalReponseTime;
        // show percent <= 20
        const countResponse20 = (reponseTimeData.filter(reponseTime => (reponseTime <= 20))).length;
        let percentResponse20 = countResponse20 ? ((countResponse20 * 100) / reponseTimeData.length).toFixed(2) : (0).toFixed(2);
        var showPercentResponse = document.getElementById('percentResponse');
        showPercentResponse.innerHTML = percentResponse20 + "%";
        // show total ticket
        var resolvedCaseAll = ticketAll;
        var resolvedCaseCRM = ResolvedReportData.length;
        var resolvedCaseJunk = resolvedCaseAll - resolvedCaseCRM;
        var totalTicket = document.getElementById('totalTicket');
        var totalTicketCRM = document.getElementById('totalTicketCRM');
        var totalTicketJunk = document.getElementById('totalTicketJunk');
        totalTicket.innerHTML = resolvedCaseAll;
        totalTicketCRM.innerHTML = resolvedCaseCRM;
        totalTicketJunk.innerHTML = resolvedCaseJunk;
    }
    function showTableResolvedCaseData(result) {
        var tbody = document.getElementById('table');
        tbody.innerHTML = '';
        for (let i = 0; i < result.length; i++) {
            var row = utils.newElement('tr');
            var date = utils.newElement('td', { class: 'date' });
            var talking = utils.newElement('td', { class: 'talking' });
            var response = utils.newElement('td', { class: 'response' });
            var targetDate = new Date(result[i].resolvedCaseDate);
            var settime = targetDate.toTimeString().substring(0, 5);
            let setdate = targetDate.getDate();
            let setyear = targetDate.getFullYear();
            let setmonth = targetDate.toLocaleString('th-TH', { month: 'short' });
            let datedashboard = setdate + " " + setmonth + " " + setyear + " " + "-" + " " + settime;
            date.innerText = datedashboard;
            talking.innerText = result[i].time;
            response.innerText = result[i].response;
            row.appendChild(date);
            row.appendChild(talking);
            row.appendChild(response);
            tbody.appendChild(row);

        }
    }
    function calculateResponseTime(ResolvedReportData, ResponseTimeReportData) {
        const resolvedCaseData = ResolvedReportData.sort((a, b) => a.dateCreated - b.dateCreated);
        var userList = [];
        resolvedCaseData.forEach(data => {
            if (checkHaveUser(data.customerId) === false) {
                userList.push(data.customerId);
            }
        });
        function checkHaveUser(data) {
            return userList.some(item => item === data);
        }
        var resolvedDataOfUsers = [];
        userList.forEach(customerId => {
            let resolvedFilter = resolvedCaseData.filter(resolved => resolved.customerId == customerId);
            resolvedDataOfUsers.push(resolvedFilter);
        });
        var cases = [];
        for (let i = 0; i < resolvedDataOfUsers.length; i++) {
            let length = resolvedDataOfUsers[i].length;
            for (let j = 0; j < length; j++) {
                let responseDataOfUser = ResponseTimeReportData.filter(user => user.customerId == resolvedDataOfUsers[i][j].customerId);
                if (j === 0) {
                    let filter = responseDataOfUser.filter(res => res.dateCreated < resolvedDataOfUsers[i][j].dateCreated && res.customerId === resolvedDataOfUsers[i][j].customerId);
                    cases.push(filter);
                } else {
                    let filter = responseDataOfUser.filter(res => (res.dateCreated > resolvedDataOfUsers[i][j - 1].dateCreated && res.dateCreated < resolvedDataOfUsers[i][j].dateCreated) && res.customerId === resolvedDataOfUsers[i][j].customerId);
                    cases.push(filter);
                }
            }
        }
        var reponseTimeData = [];
        for (let i = 0; i < cases.length; i++) {
            let responseTime = 0;
            // calc sum of responseTime and convert from millisec -> sec 
            cases[i].forEach(item => {
                responseTime += item.responseTime / 1000;
            });
            // calc avg of response time of this[i] case : sum of responseTime / number of responseTime
            if (responseTime > 0) {
                responseTime = responseTime / cases[i].length;
            }
            reponseTimeData.push(responseTime);
        }
        return reponseTimeData;
    }

    const exportResolvedCaseDataButton = document.getElementById("exportResolvedCaseDataButton");
    // exportReports(ResolvedReportData,ResolvedCaseDashboards);
    function exportReports(ResolvedReportData, ResolvedCaseDashboards) {
        exportResolvedCaseDataButton.onclick = (event) => {
            const sortedReportData = ResolvedReportData.sort((a, b) => b.dateCreated - a.dateCreated);
            // const resolvedCaseData = sortedReportData.filter(report => report.reportName == "ResolvedCase");
            if (sortedReportData) {
                socket.emit('export resolved case data', sortedReportData, ResolvedCaseDashboards, result => {
                    if (result.error) {
                        alert('Cannot export resolved case data.');
                    } else {
                        window.open(result, '_blank');
                    }
                });
            }
        };

    }

    function channelLoading(browser, show = true) {
        var loadingContainer = document.querySelector('.userListContainer .loadingContainer');
        var loading = document.getElementById('loadingSearch');
        if (show) {
            loadingContainer.classList.remove('hide');
            loadingContainer.classList.add('show');
            var currentDate = new Date(); // get the current date
            var startDate = new Date(document.getElementById('startDate').value); // get the start date from the form
            var endDate = new Date(document.getElementById('endDate').value); // get the end date from the form
            if (startDate <= currentDate && endDate >= currentDate) {
                refreshAndDoSomething(function () {
                    console.log('Callback function is executing after page refresh');
                    // Execute remaining code here
                }); // pass the callback function to the refreshAndDoSomething function once the page has been refreshed
            }
        } else {
            loadingContainer.classList.remove('show');
            loadingContainer.classList.add('hide');
        }
    
        async function refreshAndDoSomething(callback) {
            try {
                await browser.refresh(); // Wait for the page to refresh
                console.log('Page has been refreshed');
                setTimeout(function () {
                    callback(); // Call the callback function after the page has been refreshed and given some time to load
                }, 5000); // Delay the execution of the callback function by 5 seconds
            } catch (error) {
                console.error('An error occurred while refreshing the page:', error);
            }
        }

    }
    channelLoading(browser, true);

    return {
        init,
        unload,
        channelLoading
    }
}
