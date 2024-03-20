const express = require("express");

const admin = require("firebase-admin");
const credential = require("./key.json");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const moment = require("moment");

admin.initializeApp({
  credential: admin.credential.cert(credential),
});
const db = admin.firestore();
const app = express();
app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));

var generateCallRecord;
var generateLead;
var agentNo;
var agentID;
var assignAgent;
var callernumber;
var didnumber;
var baseID;
var uuid;
var checkAvailableEmployee;
var companyID;
var EmpID;
var extractCompanyId;
var checkLeadExists;
const extractedDataFromLead = [];

var fetchEmpDataDb;
let fetchEmpData = [];
var AgentDetails;
var generateCallRecord;
var ucid;
var start_stamp;
var department;
var EmpName;
var EmpDesignation;
var baseID;

let fetchDidNo;
var fetchDidNoData = [];

var fetchConditions;
const fetchConditionsData = [];
const fetchEmployeeDetailsForCA = [];
var fetchAllEmployeeDetailsForCA = [];
var agentNumberForRR;

var time = moment().format("MM/DD/YYYY hh:mm:ss");

app.post("/fetchnumber", async (req, res) => {
  didnumber = req.body.call_to_number;
  callernumber = req.body.caller_id_number;
  ucid = req.body.uuid;
  start_stamp = req.body.start_stamp;
  // console.log(callernumber);

  try {
    //fetching company id for call in first step
    extractCompanyId = await db
      .collection("masterCollection")
      .doc("didNumbers")
      .collection("didNumbers")
      .where("didNo", "==", didnumber)
      .get();

    extractCompanyId.forEach((doc) => {
      const data = doc.data();
      companyID = doc.data()["companyId"];
    });
    console.log("Company ID : " + companyID);

    // check lead exists or not

    checkLeadExists = await db
      .collection("Companies")
      .doc(companyID)
      .collection("leads")
      .where("personalDetails.mobileNo", "==", callernumber)
      .get();

    checkLeadExists.forEach((doc) => {
      const data = doc.data()["owner"];

      baseID = doc.data()["id"];

      extractedDataFromLead.push({
        designation: data.designation,
        id: data.id,
        name: data.name,
      });
    });

    if (extractedDataFromLead.length > 0) {
      //lead exists and data extracted   (EMP ID) id and name and designation    and phonenumber

      EmpID = extractedDataFromLead[0]["id"];
      EmpName = extractedDataFromLead[0]["name"];
      designation = extractedDataFromLead[0]["designation"];
      console.log("Emp ID : " + EmpID);

      //now goto emp database and fetch emp details by empid
      fetchEmpDataDb = await db
        .collection("Companies")
        .doc(companyID)
        .collection("Employees")
        .doc(EmpID);
      const response = await fetchEmpDataDb.get();

      fetchEmpData.designation = response.data()["designation"];

      fetchEmpData.phoneNo = response.data()["phoneNo"];
      fetchEmpData.name = response.data()["name"];
      fetchEmpData.id = response.data()["id"];
      fetchEmpData.status = response.data()["status"];

      console.log("Emp details : " + fetchEmpData);

      //once employee details are fetched create or update call collection genereate a call record
      console.log(
        didnumber + callernumber + start_stamp + EmpID + time + baseID
      );

      generateCallRecords(
        ucid,
        didnumber,
        callernumber,
        start_stamp,
        EmpID,
        time,
        "clienttoagent",
        companyID,
        baseID
      );

      if (fetchEmpData.status == "available") {
        AgentDetails = [
          {
            transfer: {
              type: "ivr",
              data: [11111],
            },
          },
        ];
      } else {
        AgentDetails = [
          {
            transfer: {
              type: "number",
              data: [fetchEmpData.phoneNo],
            },
          },
        ];
      }
    } else {
      //lead not found

      // if lead not exists fetch didnumbers under conversations and then telephony

      fetchDidNo = await db
        .collection("Companies")
        .doc(companyID)
        .collection("conversations")
        .doc("telephony")
        .collection("telephony")
        .doc(didnumber)
        .get();
      // const response = await fetchDidNo.get();

      fetchDidNoData.departmentName = fetchDidNo.data()["departmentname"];

      fetchDidNoData.projectID = fetchDidNo.data()["projectId"];
      fetchDidNoData.isEmployee = fetchDidNo.data()["isEmployee"];
      fetchDidNoData.employeeNo = fetchDidNo.data()["employeeNo"];
      fetchDidNoData.id = fetchDidNo.data()["id"];

      //after fetching details of did allocation we need to fetch all agents available for executing conditions like round robin or simantaneous for connecting to the non existing lead

      fetchConditions = await db
        .collection("Companies")
        .doc(companyID)
        .collection("conversations")
        .doc("telephony")
        .collection("telephony")
        .doc("conditions")
        .collection("conditions")
        .doc(fetchDidNoData.departmentName + "," + fetchDidNoData.projectID)
        .get();

      fetchConditionsData.agents = fetchConditions.data()["agents"];
      fetchConditionsData.callingAlgorithm =
        fetchConditions.data()["callingAlgorithm"];
      fetchConditionsData.departmentId = fetchConditions.data()["departmentId"];
      fetchConditionsData.projectId = fetchConditions.data()["projectId"];

      const mapLength = Object.keys(fetchConditionsData.agents).length;

      if (fetchConditionsData.callingAlgorithm == "ROUND_ROBIN") {
        //perform round robin on all agents available for conditions we fetched

        for (i = 0; i < mapLength; i++) {
          var isLastIndex = false;
          console.log("i value : ", i + 1);
          console.log("map value : " + mapLength);
          console.log("type of i : ", typeof i);
          console.log("type of map : ", typeof mapLength);
          if (i + 1 == mapLength) {
            isLastIndex = true;

            console.log("asds");
            fetchEmployeeDetails(
              "RR",
              mapLength,
              fetchConditionsData.agents[i]["id"],
              i,
              isLastIndex,
              res
            );
          } else if (fetchConditionsData.agents[i]["call_status"] == false) {
            console.log(i + " calling");
            console.log("adskadjs");

            fetchEmployeeDetails(
              "RR",
              mapLength,
              fetchConditionsData.agents[i]["id"],
              i,
              isLastIndex,
              res
            );

            break;
          }
        }
      } else {
        // performing simantaneous calling algo

        // function delayedLoop(count, delay) {
        //   let index = 0;
        //   function loop() {
        //     if (index < count) {
        //       //   fetchEmployeeDetails(
        //       //     "SMT",
        //       //     mapLength,
        //       //     fetchConditionsData.agents[index]["id"],
        //       //     index,
        //       //     true,
        //       //     res
        //       //   );
        //       console.log("Iteration", index + 1);
        //       index++;
        //       setTimeout(loop(), delay); // Call loop function recursively with a delay
        //     }
        //   }
        // }

        // // Usage
        // delayedLoop(mapLength, 1000);

        function delayedLoop(count, delay) {
          let index = 0;

          function loop() {
            if (index < count) {
              // Perform actions here
              console.log("Iteration", index + 1);
              fetchEmployeeDetails(
                "SMT",
                mapLength,
                fetchConditionsData.agents[index]["id"],
                index,
                false,
                res
              );
              index++;
              setTimeout(loop, delay); // Pass the function reference without invoking it
            }
          }

          loop(); // Start the loop
        }

        // Usage
        const maplength = mapLength; // Assuming mapLength is defined elsewhere
        delayedLoop(maplength, 100);

        // for (i = 0; i < mapLength; i++) {
        //   if (i + 1 == mapLength) {
        //     fetchEmployeeDetails(
        //       "SMT",
        //       mapLength,
        //       fetchConditionsData.agents[i]["id"],
        //       i,
        //       true,
        //       res
        //     );
        //   } else {
        //     fetchEmployeeDetails(
        //       "SMT",
        //       mapLength,
        //       fetchConditionsData.agents[i]["id"],
        //       i,
        //       false,
        //       res
        //     );
        //   }
        // }
      }

      // res.send(AgentDetails);
    }
  } catch (error) {
    res.send(error);
  }
});

const PORT = process.env.PORT || 3000;

// app.get('/', (req, res) => {
//     res.send('Hello, World!');
// });

async function generateCallRecords(
  ucid,
  callerDid,
  callerNumber,
  callStartStamp,
  agentid,
  time,
  calldirection,
  companyid,
  baseID
) {
  const calldetails = {
    ucid: ucid,
    callerDid: callerDid,
    callerNumber: callerNumber,
    agentDid: "",
    callStartTime: callStartStamp,
    recordingLink: "",
    empID: agentid,
    callStatus: "Started",
    callTransfer: false,
    callTransferIds: [],
    department: "A101",
    isNewLeadCall: false,
    baseID: baseID,
    isSmsSent: false,
    callDateTime: time,
    advertisedNumber: false,
    callDirection: calldirection,
    callType: "ivr",
  };

  generateCallRecord = db
    .collection("Companies")
    .doc(companyid)
    .collection("conversations")
    .doc("telephony")
    .collection("call collection")
    .doc(ucid)
    .set(calldetails);
  generateCallRecord;
}

// created function where we will check and get the details of employeeeee one by one by passing and returning . here we will get name designation , name , id , no and status for will be used for connecting call , creating new lead and creating call collection for a new lead
var v1 = null;
var v2 = null;
var v3 = null;
var v4 = null;
var v5 = null;
var v6 = null;
var v7 = null;

async function fetchEmployeeDetails(
  algoType,
  agentLength,
  employeeid,
  agentIndex,
  isLastIndexx,
  res
) {
  var agentNo = "agents." + agentIndex.toString();
  const fetchingEmployeeById = await db
    .collection("Companies")
    .doc(companyID)
    .collection("Employees")
    .doc(employeeid);

  ///// last value true nahi aari h pta mniu q
  if (isLastIndexx == true && algoType == "RR") {
    console.log("adsadsds");
    AgentDetails = [
      {
        transfer: {
          type: "ivr",
          data: [11111],
        },
      },
    ];

    // updating all agents call status false again
    for (i = 0; i < agentLength; i++) {
      const updateAgentListAIC = db
        .collection("Companies")
        .doc(companyID)
        .collection("conversations")
        .doc("telephony")
        .collection("telephony")
        .doc("conditions")
        .collection("conditions")
        .doc(fetchDidNoData.departmentName + "," + fetchDidNoData.projectID)
        .update({
          [`${agentNo}`]: {
            call_status: false,
            id: employeeid,
          },
        });
      updateAgentListAIC;
    }

    res.send(AgentDetails);
  }

  if (algoType == "RR") {
    // update agent list available in conditions collection as true if agent is assinged

    fetchingEmployeeById.get().then((value) => {
      console.log(value.data()["status"]);
      if (value.data()["status"] == "available" && isLastIndexx == false) {
        fetchEmployeeDetailsForCA.designation = value.data()["designation"];

        fetchEmployeeDetailsForCA.phoneNo = value.data()["phoneNo"];
        fetchEmployeeDetailsForCA.name = value.data()["name"];
        fetchEmployeeDetailsForCA.id = value.data()["id"];
        fetchEmployeeDetailsForCA.status = value.data()["status"];

        const updateAgentListAIC = db
          .collection("Companies")
          .doc(companyID)
          .collection("conversations")
          .doc("telephony")
          .collection("telephony")
          .doc("conditions")
          .collection("conditions")
          .doc(fetchDidNoData.departmentName + "," + fetchDidNoData.projectID)
          .update({
            [`${agentNo}`]: {
              call_status: true,
              id: employeeid,
            },
          });

        updateAgentListAIC;

        console.log(fetchEmployeeDetailsForCA.phoneNo) + "fhfhghggh";

        AgentDetails = [
          {
            transfer: {
              type: "number",
              data: [fetchEmployeeDetailsForCA.phoneNo],
            },
          },
        ];
        res.send(AgentDetails);
      }
    });
  } else {
    console.log("Asasds");
    fetchingEmployeeById.get().then((value) => {
      // fetchAllEmployeeDetailsForCA.push(value.data()["phoneNo"].toString());

      if (agentIndex == 0) {
        v1 = value.data()["phoneNo"].toString();
      }
      if (agentIndex == 1) {
        v2 = value.data()["phoneNo"].toString();
      }
      if (agentIndex == 2) {
        v3 = value.data()["phoneNo"].toString();
      }
      if (agentIndex == 3) {
        v4 = value.data()["phoneNo"].toString();
      }
      if (agentIndex == 4) {
        v5 = value.data()["phoneNo"].toString();
      }
      if (agentIndex == 5) {
        v6 = value.data()["phoneNo"].toString();
      }

      if (agentIndex == agentLength - 1) {
        AgentDetails = [
          {
            transfer: {
              type: "number",
              data:
                v1 == null
                  ? []
                  : v2 == null
                  ? [v1]
                  : v3 == null
                  ? [v1 + "," + v2]
                  : v4 == null
                  ? [v1 + "," + v2 + "," + v3 + ""]
                  : v5 == null
                  ? [v1 + "," + v2 + "," + v3 + "," + v4]
                  : v6 == null
                  ? [v1 + "," + v2 + "," + v3 + "," + v4 + "," + v5]
                  : v7 == null
                  ? [v1 + "," + v2 + "," + v3 + "," + v4 + "," + v5 + "," + v6]
                  : [],
            },
          },
        ];
        res.send(AgentDetails);
      }
    });
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
