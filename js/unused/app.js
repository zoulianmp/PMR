// Page controller
angular.module('myApp')
.controller('pageController', function($http,$scope,$timeout,$filter,$sce,chartService){
  // Grab the list of patients and categorize by doctor
  $http.get("php/getPatientData.php").then(function (response) {
    $scope.data=response.data.list;
    //Create a doctor class to store names and list of patients
    function Doctor(firstName, lastName){
      this.firstName = firstName;
      this.lastName = lastName;
      this.patients = [];
    }

    //Create a patient class to store names and id
    function Patient(firstName, lastName, ID){
      this.firstName      = firstName;
      this.lastName       = lastName;
      this.ID             = ID;
      this.diagnosis      = [];
      this.isReviewed     = false;
    }

    //
    function Diagnosis(desc, tumorSize, summaryStage, stageCriteria, dateStamp){
      this.desc           = desc;
      this.tumorSize      = tumorSize;
      this.summaryStage   = summaryStage;
      this.stageCriteria  = stageCriteria;
      this.dateStamp      = dateStamp;
    }

    var dataList = []; // the list of doctor objects with patients
    var docsInList = []; // create an array to hold doctor names
    var index;
    var indexPat;

    // scan thorugh whole sql table
    for (var i = 0; i < $scope.data.length; i++){
      //load index of doctor lastname
      index = docsInList.indexOf($scope.data[i].DocLastName);
      //check if doctor already in list exists
      if (index === -1){
        //if not push doc name to list of already found doctors
        docsInList.push($scope.data[i].DocLastName);
        //push doctot to list to be stored in scope
        dataList.push(new Doctor($scope.data[i].DocFirstName,$scope.data[i].DocLastName));
        // look though list for patients with same doctor
        var patientsInList = [];
        for (var j = 0; j<$scope.data.length; j++){
          if (docsInList[docsInList.length-1] === $scope.data[j].DocLastName){
            // push patients in doctor list
            indexPat = patientsInList.indexOf($scope.data[j].PatientID);
            if ( indexPat === -1){
              patientsInList.push($scope.data[j].PatientID);
              var diagnosisData = new Diagnosis($scope.data[j].Diagnosis,
                $scope.data[j].TumorSize,
                $scope.data[j].SummaryStage,
                $scope.data[j].StageCriteria,
                $scope.data[j].DiagDate);
              //console.log($scope.data[j].DiagDate);
              var patient = new Patient(  $scope.data[j].FirstName,
                $scope.data[j].LastName,
                $scope.data[j].PatientID);

              patient.diagnosis.push(diagnosisData);
              dataList[dataList.length-1].patients.push(patient);
            } else {
              var diagnosisData = new Diagnosis($scope.data[j].Diagnosis,
                $scope.data[j].TumorSize,
                $scope.data[j].SummaryStage,
                $scope.data[j].StageCriteria,
                $scope.data[j].DiagDate);
              dataList[dataList.length-1]
              .patients[dataList[dataList.length-1].patients.length-1]
              .diagnosis.push(diagnosisData);
            }
          }
        }
      }
    }
    $scope.dataList = dataList;
    // set first doctor as default
    $scope.activeDoctorIndex = 0; 
    // Set first patient for first doctor
    $scope.activePatientIndex = 0; 
    $scope.patientID = $scope.dataList[0].patients[0].ID;
    $scope.patientDiagnosis = $scope.dataList[0].patients[0].diagnosis;
    //Set the completion
    $scope.patientCompletionCount = 0;

    // First patient info
    $http.post("php/getPatientPhoto.php", {patientID: $scope.patientID})
    .then( function (response) {
      $scope.patientPhoto = response.data;
    });

    // First Patient documenst
    $http.post( "php/getPatientDocuments.php", {patientID: $scope.patientID})
    .then( function (response) {
      $scope.documents = response.data
      checkDocs(response.data);
    });
    getPatientTreatmentinfo();
    getNewStart();
    chartService('#progress', $scope.patientID);
    console.log(dataList);
    $(".se-pre-con").fadeOut(1000);
    $('#question').popover({ html : true});
  });

  // Grab the data for active patient when selecting frrom dropdown
  $scope.updateActivePatient = function(lookupID){
    var storedID, found = false;
    for (var i = 0; i < $scope.dataList.length && !found; i++){
      for (var j =0; j < $scope.dataList[i].patients.length && !found; j++){
        storedID = $scope.dataList[i].patients[j].ID;
        if (lookupID === storedID){
          found = true;
          $scope.activeDoctorIndex = i;
          $scope.activePatientIndex = j;
          $scope.patientID = lookupID;
          $scope.patientDiagnosis = $scope.dataList[i].patients[j].diagnosis;
        }
      }
    }
  }

  //Grabs patient info on next or previous click
  $scope.grabPatientInfo = function() {
    var data = {
      patientID: $scope.patientID
    };

    $http.post( "php/getPatientPhoto.php", data).then( function (response) {
      $scope.patientPhoto = response.data;
    });

    $http.post( "php/getPatientDocuments.php", data).then( function (response) {
      $scope.documents = response.data
      checkDocs(response.data);
    });
    //console.log($scope.dataList);
    getPatientTreatmentinfo();
    getNewStart();
    chartService('#progress', $scope.patientID);
    $("#overview-tab").click();
    $timeout(function() {
        repopulateDoc();
    }, 2000); 
  }

  // Moves to next patient and updates fields for current patient
  $scope.nextPatient = function(){
    var isLastDoctorPatient = $scope.dataList[$scope.activeDoctorIndex].patients.length-1 === 
    $scope.activePatientIndex;
    var isLastDoctor = $scope.dataList.length-1 === $scope.activeDoctorIndex;

    if (isLastDoctor && isLastDoctorPatient){
      $scope.activeDoctorIndex = 0;
      $scope.activePatientIndex = 0;
    }
    else if (isLastDoctorPatient){
      $scope.activeDoctorIndex++;
      $scope.activePatientIndex = 0;
    } else {
      $scope.activePatientIndex++;
    }
    $scope.patientID = $scope.dataList[$scope.activeDoctorIndex].patients[$scope.activePatientIndex].ID;
    $scope.patientDiagnosis = $scope.dataList[$scope.activeDoctorIndex].patients[$scope.activePatientIndex].diagnosis;
  }

  // Moves to next patient and updates fields for current patient
  $scope.previousPatient = function(){
    var isFirstDoctorPatient = $scope.activePatientIndex === 0;
    var isFirstDoctor = $scope.activeDoctorIndex === 0;

    if (isFirstDoctor && isFirstDoctorPatient){
      $scope.activeDoctorIndex = $scope.dataList.length-1;
      $scope.activePatientIndex = $scope.dataList[$scope.activeDoctorIndex]
      .patients.length-1;
    }
    else if (isFirstDoctorPatient){
      $scope.activeDoctorIndex--;
      $scope.activePatientIndex = $scope.dataList[$scope.activeDoctorIndex]
      .patients.length-1;
    } else{
      $scope.activePatientIndex--;
    }
    $scope.patientID = $scope.dataList[$scope.activeDoctorIndex].patients[$scope.activePatientIndex].ID;
    $scope.patientDiagnosis = $scope.dataList[$scope.activeDoctorIndex].patients[$scope.activePatientIndex].diagnosis;
  }

  // Grabbing the patient document that is clicked on
  $scope.displayDocument = function(filename){
    var data = {
      FileName: filename
    };

    var options = {
      pdfOpenParams: { view: 'FitH', page: '1' }
    };

    $http.post( "php/downloadPDF.php", data).then( function (response) {
      PDFObject.embed(response.data, "#Doc", options);
    });
    $("#doc-tab").click();
  }

  //Filerting out the files that have distribution and imrt in name for documents list
  $scope.keepOnTop = function (x) {
    var lowerCaseDoc = x.DocType.toLowerCase();
    if (lowerCaseDoc.indexOf("distribution") != -1 || lowerCaseDoc.indexOf("imrt") != -1) {
      return -1;
    }else {
      return 1;
    }
  }

  var checkDocs = function(data){
    function Document(fileType){
      this.fileType = fileType;
      this.creationDate = 0;
      this.isAvailable = false;
    }  

    $scope.requiredDocuments = [new Document("RO-Consult"), new Document("Pathology"),
    new Document("Rad Onc Requisition"), 
    new Document("RO-CT Planning Sheet"),
    new Document("Radiotherapy Prescription")];
    var namesearch = ["consult", "pathology", "requisition", "planning sheet", "prescription"];
    var x;
    for (x in data){        
      var name = data[x].DocType.toLowerCase();
      var date = new Date(data[x].Date.substring(0,11));
      var cutoffDate = new Date();
      // Change this value for cutoff date
      cutoffDate.setDate(cutoffDate.getDate()-360)
      for (var i =0; i<namesearch.length; i++){
        if(name.indexOf(namesearch[i]) != -1 && date > cutoffDate){
          $scope.requiredDocuments[i].isAvailable = true;
        }  
      }

    }
  }

  // Grab Patient specific treatment info
  var getPatientTreatmentinfo = function() {
    $http.post("php/queryTreatment.php", {patientID: $scope.patientID})
    .then( function (response) {
      $scope.TreatmentInfo = [];
      var TreatmentInfo = response.data;
      console.log(TreatmentInfo);
      var i = 0;
      var cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate()-30);

      for (item1 in TreatmentInfo){
        for (item in TreatmentInfo[item1]){
          planCreationDate = new Date(TreatmentInfo[item1][item].date);
          if (TreatmentInfo[item1][item].hasOwnProperty('dose') 
            && (TreatmentInfo[item1][item].cstatus === 'ACTIVE' 
              || planCreationDate > cutoffDate)
            && TreatmentInfo[item1][item].intent !== 'VERIFICATION'){

            $scope.TreatmentInfo.push(new Object());
          $scope.TreatmentInfo[i].Dose =  TreatmentInfo[item1][item].dose;
          $scope.TreatmentInfo[i].noFractions = TreatmentInfo[item1][item].nofractions;
          $scope.TreatmentInfo[i].Plan = TreatmentInfo[item1][item].name;
          i++;
        }
      }
    }
      //console.log($scope.TreatmentInfo);
    });
  }

  var getNewStart = function(){
    $http.post("php/getNewStart.php", {patientID: $scope.patientID})
    .then( function (response) {
      $scope.NewStart = response.data.startDate;
    });
    $http.post("php/getSGAS.php", {patientID: $scope.patientID})
    .then( function (response) {
      $scope.SGAS = response.data.DueDate;
    });
  }

  // insert placeholder in the Documents tab when switching from
  var repopulateDoc = function() {
    var element = document.getElementById("docpane");
    var original = document.getElementById("Doc");
    element.removeChild(original);
    element.innerHTML = '<div id="Doc"><h2>Select a document!</h2></div>'
  }

});