var prodGrpTypeVal;
var searchKeyVal;
var csrfVal;
var cestamp;
var domainURL;
var partTypeVal;
var productName;
define("DS/Solize/ELGI/PartNumbering", [
  "UWA/Core",
  "UWA/Drivers/Alone",
  "DS/WAFData/WAFData",
  "DS/PlatformAPI/PlatformAPI",
  "UWA/Controls/Popup",
  "UWA/Controls/DataGrid",
  "DS/DataDragAndDrop/DataDragAndDrop",
  "DS/i3DXCompassServices/i3DXCompassServices",
  "text!DS/YATGDesignPhilosophy/assets/templates/customConfigJSON.json",
], function (Core, Alone, WAFData, PlatformAPI, Popup, DataGrid, DataDnD, i3DXCompassServices,customConfigJSON) {
  const customConfigurationJSON = JSON.parse(customConfigJSON);
  var grid;
  var rowsMap = {};
  var platformId;
  var myWidget = {
    onLoadWidget: function () {
		rowsMap = {};
	  injectRemoteUIKitCSS();
      //widget.body.innerHTML = "";
      console.log("widget loaded");
      platformId = widget.getValue("x3dPlatformId");
      console.log("platformId:", platformId);
      /* widget.body.empty();
      widget.body.setStyle("border", "2px dashed #666");
      widget.body.setStyle("padding", "20px"); */
      //widget.body.setText("Drag a Physical Product here");
	  
	  const mainContainer = document.createElement("div");
      mainContainer.className = "main-container";

      const parentContainer = document.createElement("div");
      parentContainer.className = "parent-container";
		window._parentContainer = parentContainer;
      // Example styling for debugging
      parentContainer.style.border = "2px solid #ccc";
      parentContainer.style.padding = "10px";
	  const result = [];
	  createGrid(result, parentContainer); 

      DataDnD.droppable(widget.body, {
        enter: function (el, event) {
          if (el && el.classList) el.classList.add("drag-over");
        },
        over: function (el, event) {
          return true;
        },
        leave: function (el, event) {
          if (el && el.classList) el.classList.remove("drag-over");
        },
        drop: function (dropData, el, event) {
			console.log("Inside drop");
		  if (el && el.classList) el.classList.remove("drag-over");

		  try {
			const parsed = typeof dropData === 'string' ? JSON.parse(dropData) : dropData;
			console.log("Dropped Data:", parsed);
			
			const items = parsed?.data?.items;
			if (!Array.isArray(items) || items.length === 0) {
			  console.warn("No items found in dropped data");
			  return;
			}
			console.log("items===>",items);
			let dropCount = items.length;
			items.forEach(engItem => {
			  const pid = engItem?.physicalId || engItem?.objectId || engItem?.id;
			  if (!pid) {
				console.warn("Invalid object:", engItem);
				dropCount--;
				return;
			  }
			const objectType = engItem?.objectType || '';
			  if (objectType !== 'VPMReference') {
				alert(`Only VPMReference objects are allowed. Skipped item: ${engItem?.displayName || pid}`);
				dropCount--;
				return;
			  }
			  const isNew = !rowsMap[pid];
			  const proceedWithDrop = (maturityState, engItemDetails) => {
				   console.log("Inside proceedWithDrop===>engItemDetails==>",engItemDetails);
				   productName		= engItemDetails.name;
				   cestamp		= engItemDetails.cestamp;
				   const partNumber = engItemDetails?.["dseng:EnterpriseReference"]?.partNumber || '';
				   searchKeyVal = engItemDetails?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_SearchKeyII"] || '';
				   var prodGrpTypeOrgVal = engItemDetails?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_ProductGroupType"] || '';
				   prodGrpTypeVal	=	prodGrpTypeOrgVal.split("-")[0];
				   partTypeVal = engItemDetails?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_PartType"] || '';
				   console.log("searchKeyVal====>",searchKeyVal);
				   console.log("prodGrpTypeVal====>",prodGrpTypeVal);
				   console.log("partTypeVal====>",partTypeVal);
					  const rootRow = {
						id: pid,
						name: engItem?.displayName || "Root",
						type: engItem?.objectType || "VPMReference",
						created: engItem?.created || new Date().toISOString(),
						level: 0,
						enterpriseItemNumber: partNumber,
						maturityState: maturityState || '',
						searchKeyII: searchKeyVal || '',
						hasChildren: true,
						_expanded: true,
						parentId: null
					  };

					  rowsMap[pid] = rootRow;
					  updateDataGrid();
					  /* fetchChildren(pid, 1, rootRow, function () {
						dropCount--;
						if (dropCount === 0) {
						  updateDataGrid();
						}
					  }); */
					};

					// If created is available, proceed directly
					if (engItem?.state) {
						  proceedWithDrop(engItem?.state, engItem);
						} else {
						  fetchEngItemDetails(pid, function (response) {
							const item = response?.member?.[0];
							const maturityVal = item?.state || '';
							proceedWithDrop(maturityVal, item);
						  }, function (err) {
							console.error("Failed to fetch EngItem details:", err);
							proceedWithDrop(null, null); 
						  });
						}
				  });
				} catch (e) {
				  console.error("Failed to parse dropped data:", e);
				}
				
				console.log("Drop End");
		}
      });
	  mainContainer.appendChild(parentContainer);
	  return mainContainer;
    }
  };
function fetchEngItemDetails(pid, onSuccess, onError) {
	if(pid){
		i3DXCompassServices.getServiceUrl({
		platformId: widget.getValue("x3dPlatformId"),
		serviceName: "3DSpace",
		onComplete: function (URL3DSpace) {
		  let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
		  //if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");

		  const csrfURL = baseUrl + "/resources/v1/application/CSRF";

		  WAFData.authenticatedRequest(csrfURL, {
			method: "GET",
			type: "json",
			onComplete: function (csrfData) {
			  const csrfToken = csrfData.csrf.value;
			  const csrfHeader = csrfData.csrf.name;

			  const getUrl = baseUrl + "/resources/v1/modeler/dseng/dseng:EngItem/" + pid +"?$mask=dsmveng:EngItemMask.Details";

			  WAFData.authenticatedRequest(getUrl, {
				method: "GET",
				type: "json",
				headers: {
				  "Content-Type": "application/json",
				  "SecurityContext": "VPLMProjectLeader.Company Name.Common Space",
				  [csrfHeader]: csrfToken
				},
				onComplete: function (resp) {
				  console.log("EngItem GET success:", resp);
				  onSuccess && onSuccess(resp);
				},
				onFailure: function (err) {
				  console.error("EngItem GET failed:", err);
				  onError && onError(err);
				}
			  });
			},
			onFailure: function (err) {
			  console.error("CSRF token fetch failed:", err);
			  onError && onError(err);
			}
		  });
		},
		onFailure: function () {
		  console.error("Failed to get 3DSpace URL");
		  onError && onError("Service URL failed");
		}
	  });
	}
}
  function createGrid(data, container) {
  if (grid) grid.destroy();

  container.innerHTML = "";


  const toolbar = UWA.createElement('div', {
    class: 'toolbar',
    styles: {
      display: 'flex',
      justifyContent: 'flex-start',
      gap: '10px',
      padding: '8px',
      background: '#f8f8f8',
      borderBottom: '1px solid #ddd'
    }
  });
	function showConfirmationPopup({ title, message, onConfirm }) {
		  const overlay = UWA.createElement('div', {
			styles: {
			  position: 'fixed',
			  top: 0,
			  left: 0,
			  width: '100%',
			  height: '100%',
			  backgroundColor: 'rgba(0,0,0,0.4)',
			  display: 'flex',
			  justifyContent: 'center',
			  alignItems: 'center',
			  zIndex: 9999
			}
		  }).inject(document.body);

		  const modal = UWA.createElement('div', {
			styles: {
			  backgroundColor: '#fff',
			  padding: '20px',
			  borderRadius: '8px',
			  width: '350px',
			  textAlign: 'center',
			  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
			}
		  }).inject(overlay);

		  UWA.createElement('h4', { text: title }).inject(modal);
		  UWA.createElement('p', { text: message }).inject(modal);

		  const btnGroup = UWA.createElement('div', {
			styles: {
			  display: 'flex',
			  justifyContent: 'space-around',
			  marginTop: '20px'
			}
		  }).inject(modal);

		  UWA.createElement('button', {
			text: 'Yes',
			class: 'btn btn-primary',
			styles: { flex: 1, marginRight: '10px' },
			events: {
			  click: function () {
				overlay.remove();
				onConfirm && onConfirm();
			  }
			}
		  }).inject(btnGroup);

		  UWA.createElement('button', {
			text: 'Cancel',
			class: 'btn',
			styles: { flex: 1 },
			events: {
			  click: function () {
				overlay.remove();
			  }
			}
		  }).inject(btnGroup);
		}
 const addButton = UWA.createElement('button', {
  text: 'Set EIN',
  styles: {
    padding: '6px 12px',
    background: '#0073E6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  events: {
    click: function () {
      const selectedCheckboxes = widget.body.querySelectorAll('.row-selector:checked');
      if (selectedCheckboxes.length === 0) {
        alert("No rows selected!");
        return;
      }

      const selectedData = Array.from(selectedCheckboxes).map(cb => {
        const rowId = cb.getAttribute('data-id');
        const rowData = rowsMap[rowId];
        if (!rowData) return null;
        return {
          name: rowData.name,
          quantity: rowData.quantity || "N/A",
          partNumber: rowData.enterpriseItemNumber || ''
        };
      }).filter(Boolean);

      const invalidRows = selectedData.filter(row => {
        const fullRow = Object.values(rowsMap).find(r => r.name === row.name);
        if (!fullRow) return true;
        const state = (fullRow.maturityState || "").split(".").pop().toUpperCase();
        return state !== "IN_WORK";
      });
		const alreadySetRows = selectedData.filter(row => row.partNumber && row.partNumber.trim() !== '');
      if (invalidRows.length > 0) {
        const names = invalidRows.map(r => r.name).join(", ");
        alert(`Cannot proceed. Only 'IN_WORK' objects can be set.\nOffending object(s): ${names}`);
        return;
      } else if (alreadySetRows.length > 0) {
		  const names = alreadySetRows.map(r => r.name).join(", ");
		  alert(`EIN is already set for: ${names}. You cannot reset EIN.`);
		  return;
		} else {
		    showConfirmationPopup({
				title: "Set EIN",
				message: "Do you want to proceed with setting EIN for the selected items?",
				onConfirm: async function () {
				  const spinnerOverlay = UWA.createElement('div', {
					styles: {
					  position: 'fixed',
					  top: 0,
					  left: 0,
					  width: '100%',
					  height: '100%',
					  backgroundColor: 'rgba(0,0,0,0.3)',
					  zIndex: 9999,
					  display: 'flex',
					  justifyContent: 'center',
					  alignItems: 'center'
					}
				  }).inject(document.body);

				  const spinnerBox = UWA.createElement('div', {
					text: 'Setting EIN...',
					styles: {
					  padding: '20px',
					  background: '#fff',
					  borderRadius: '8px',
					  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
					  fontSize: '16px',
					  fontWeight: 'bold'
					}
				  }).inject(spinnerOverlay);
				  
				  // Call EIN Web Service 
				  const selectedIds = Array.from(widget.body.querySelectorAll('.row-selector:checked'))
									.map(cb => cb.getAttribute('data-id')).filter(Boolean);
					console.log("selectedIds:",selectedIds);
				 if (selectedIds.length === 0) {
					  alert("Please select at least one row.");
					  return;
					}
					let remaining = selectedIds.length;
					
					for (const id of selectedIds) {
					  const libraryInfo = await fetchLibraryForPartAsync(id);
					  const classId = libraryInfo.classId;
					  console.log("classId:", classId);

					  const objName = rowsMap[id]?.name || id;
					  if (!classId) {
						spinnerOverlay.remove(); 
						alert(`Object "${objName}" is not classified. EIN cannot be set.`);
						remaining = 0;
						return;
					  }

					  const { classFullPath, nonStandardChild, classifiedUnderClassName } = await fetchLabelsFromIDs(id);
					  console.log("classFullPath:", classFullPath);
					  console.log("nonStandardChild:", nonStandardChild);
					  console.log("classifiedUnderClassName:", classifiedUnderClassName);

					  let sequenceKey = null;
					  let sub_runningNo = null;
					  let variant = null;
					  let manualRunningNo = null;
					  let runningNo = null;

					  switch (classifiedUnderClassName) {
						case "NON-STANDARD": {
						  let physicalProdInfoResp	=	await fetchPhysicalProductInfo(id);
						  console.log("physicalProdInfoResp===>",physicalProdInfoResp);
						  switch(nonStandardChild){
							  case "51-Foundry":{
								  manualRunningNo		= libraryInfo.attributes["ELGI_CA_ManualPartNo"] || "";
								  const partItemType 	= libraryInfo.attributes["ELGI_CA_FouItemType"] || "";
								  const processOrGuide 	= libraryInfo.attributes["ELGI_CA_FouProcessOrGuide"] || "";
								  const customerOrMake 	= libraryInfo.attributes["ELGI_CA_FouCustomerOrMake"] || "";
								 
								  if(!manualRunningNo){
									  if (!partItemType) {
										alert("Please fill the Part Item Type attribute for " + objName);
										return;
									  }
									  if (!processOrGuide) {
										alert("Please fill the Process/Grade attribute for " + objName);
										return;
									  }
									  if (!customerOrMake) {
										alert("Please fill the Customer/Make attribute for " + objName);
										return;
									  }

									 
									 sequenceKey = `${partItemType}-${processOrGuide}-${customerOrMake}-`;
									  
								  }else{
										const response = await callEINWebServiceAsync(id, manualRunningNo);
										if(response){
											console.log(`EIN updated for ${id}: ${sequenceKey}`);
											await setSearchKey(id,classifiedUnderClassName);
											checkDone();
										}
								  }
								  break;
							  }
							  default : {
								  let productGroupOrgVal = physicalProdInfoResp["dseno:EnterpriseAttributes"].ELGI_CA_ProductGroupType;
								  let productGroup = productGroupOrgVal.split("-")[0];
								  console.log("productGroup====>", productGroup);
								  let itemCategory = "";
								  const drawingReference = libraryInfo.attributes["ELGI_CA_DrawingSizeStandardReference"] || "";
								  sub_runningNo = libraryInfo.attributes["ELGI_CA_SubRunningSeries"] || "";
								  variant = libraryInfo.attributes["ELGI_CA_Variant"] || "";
								  manualRunningNo		= libraryInfo.attributes["ELGI_CA_ManualPartNo"] || "";
								  //runningNo = libraryInfo.attributes["RunningNumber"] || "";

								  switch (nonStandardChild) {
									case "50-MedicalGasAlarmSystem-MGAS":
									case "78-Axis-102":
									case "79-Axis-159":
									case "80-Axis-225":
									case "81-Axis-284":
									case "83-Axis-159-II-stg":
									case "99-AirEnds":
									  itemCategory = libraryInfo.attributes["ELGI_CA_TDItemCategory"] || "";
									  break;
									case "96-JIGS-FIXTURES":
									  itemCategory = libraryInfo.attributes["ELGI_CA_JigsItemCategory"] || "";
									  break;
									case "Other Product Groups":
									  itemCategory = libraryInfo.attributes["ELGI_CA_PartItemCategory"] || "";
									  break;
								  }

								  if (!productGroup || productGroup.toLowerCase() === "unassigned") {
									alert("Please fill the Product Group attribute for " + objName);
									return;
								  }
								  if (!itemCategory || itemCategory.toLowerCase() === "unassigned") {
									alert("Please fill the Item Category attribute for " + objName);
									return;
								  }
								  if (!drawingReference || drawingReference.toLowerCase() === "unassigned") {
									alert("Please fill the Drawing Reference attribute for " + objName);
									return;
								  }
								  if (!sub_runningNo || sub_runningNo.toLowerCase() === "unassigned") {
									alert("Please fill the Sub-Running Number attribute for " + objName);
									return;
								  }

								  if (variant && variant.toLowerCase() !== "unassigned") {
									  if(!manualRunningNo){
										  alert("Please Fill the Manual Running Number for "+objName);
										  return;
									  }
									sequenceKey = productGroup + itemCategory + drawingReference + manualRunningNo + sub_runningNo;
								  } else {
									sequenceKey = productGroup + itemCategory + drawingReference + sub_runningNo;
								  }
							  }
						  }
						  break;
						}

						case "BOUGHT-OUT": {
						  console.log("Inside Boughtout Part");
						  const accessID = libraryInfo.attributes["ELGI_CA_AccessoryIdentification"] || "";
						  const accessMakeID = libraryInfo.attributes["ELGI_CA_AccessoryMakeIdentification"] || "";

						  if (!accessID) {
							alert("Please fill the AccessoryIdentification attribute for " + objName);
							return;
						  }
						  if (!accessMakeID) {
							alert("Please fill the AccessoryMakeIdentification attribute for " + objName);
							return;
						  }

						  sequenceKey = "B" + accessID + accessMakeID;
						  break;
						}

						default:
						  checkDone();
					  }

					  console.log("sequenceKey:", sequenceKey);

					  if (variant && variant.toLowerCase() !== "unassigned" && sequenceKey) {
						const response = await callEINWebServiceAsync(id, sequenceKey);
						if(response){
							console.log(`EIN updated for ${id}: ${sequenceKey}`);
							await setSearchKey(id,classifiedUnderClassName);
							checkDone();
						}
					  } else {
						if (sequenceKey) {
						  let runningNo;
						  if(nonStandardChild === "51-Foundry"){
							  runningNo	=	await fetchRunningNumberAsync(sequenceKey, "FOUNDRY");
						  }else{
							  runningNo	=	await fetchRunningNumberAsync(sequenceKey, classifiedUnderClassName);
						  }
						  
						  if (!runningNo) {
							alert("Error fetching Running Number from DB");
							return;
						  }

						  const newEIN = sequenceKey + runningNo;
						  console.log("newEIN:", newEIN);
						  console.log("classifiedUnderClassName:", classifiedUnderClassName);

						  switch (classifiedUnderClassName) {
							case "BOUGHT-OUT":
							  if (runningNo.length > 4) {
								alert(`Boughtout Part Number limit exceeded for ${objName}`);
								return;
							  }
							  if (newEIN.length === 13) {
								 const response = await callEINWebServiceAsync(id, newEIN);
								if(response){
									console.log(`EIN updated for ${id}: ${newEIN}`);
									await setSearchKey(id, classifiedUnderClassName);
									checkDone();
								}
							  }
							  break;

							default:
							{
							  switch(nonStandardChild){
								  case "51-Foundry" :{
									  if (runningNo.length > 4) {
										alert(`FOUNDRY Part Number limit exceeded for ${objName}`);
										return;
									  }
									  const response = await callEINWebServiceAsync(id, newEIN);
										if(response){
											console.log(`EIN updated for ${id}: ${newEIN}`);
											await setSearchKey(id, classifiedUnderClassName);
											checkDone();
										}
										break;
								  }
								  default:{
									  const runningNoLength = 9 - sequenceKey.length;
									  if (runningNo.length > runningNoLength) {
										alert(`Non-Standard Part Number for '${nonStandardChild}' limit exceeded for ${objName}`);
										return;
									  }

									  if (newEIN.length === 9) {
										const response = await callEINWebServiceAsync(id, newEIN);
										if(response){
											console.log(`EIN updated for ${id}: ${newEIN}`);
											await setSearchKey(id, classifiedUnderClassName);
											checkDone();
										}
									  }
								  }
							  }
							  
							}
						  }
						}
					  }
					}

					function checkDone() {
					  remaining--;
					  if (remaining === 0) {
						triggerFinalRefresh();
					  }
					}

				  function triggerFinalRefresh() {
					  const rootIds = Object.values(rowsMap)
						.filter(row => row.level === 0)
						.map(row => row.id);

					  //rowsMap = {}; 

					  let pending = rootIds.length;

					  rootIds.forEach(rootId => {
						  fetchEngItemDetails(rootId, (response) => {
						  
							  const item = response?.member?.[0];
							  const updatedEIN = item?.["dseng:EnterpriseReference"]?.partNumber || '';
							  var updatedSKII = item?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_SearchKeyII"] || '';
							  console.log("updatedSKII===>",updatedSKII);
							  console.log("updateditem===>",item);
							  if (item && rowsMap[rootId]) {
								rowsMap[rootId].id = item.id;
								rowsMap[rootId].name = item.title;
								rowsMap[rootId].title = item.title;
								rowsMap[rootId].structureLevel = item.level || '1';
								rowsMap[rootId].maturityState = item.state || '';
								rowsMap[rootId].enterpriseItemNumber = updatedEIN;
								rowsMap[rootId].searchKeyII = updatedSKII;
							  }

							  pending--;
							  if (pending === 0) {
								spinnerOverlay.remove();
								alert("EIN update completed.");
								updateDataGrid();
							  }
							  
							}, (err) => {
							  console.error("Failed to fetch EngItem:", rootId, err);
							  pending--;
							  if (pending === 0) {
								spinnerOverlay.remove();
								updateDataGrid();
							  }
							});

						});
					}
				
				}
			  });

	  }
    }
  }
});

 const removeBtn = UWA.createElement('button', {
  text: 'Remove',
  styles: {
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  events: {
    click: function () {
	  console.log("Remove Button clicked!!!");
      const selectedCheckboxes = widget.body.querySelectorAll('.row-selector:checked');
      if (selectedCheckboxes.length === 0) {
        alert("No rows selected!");
        return;
      }
	  showConfirmationPopup({
			title: "Remove Item",
			message: "Do you want to proceed with removing the selected items?",
			onConfirm: function () {
				  Array.from(selectedCheckboxes).forEach(cb => {
						const rowId = cb.getAttribute('data-id');
						delete rowsMap[rowId];
					});
				  updateDataGrid();
				  alert("The selected Items were successfully removed!!!");
			}
	  });
	}
  }
 });
	removeBtn.onmouseover = () => {
	  removeBtn.style.background = '#c82333';
	};
	removeBtn.onmouseout = () => {
	  removeBtn.style.background = '#dc3545';
	};
  toolbar.appendChild(addButton);
  toolbar.appendChild(removeBtn);
  container.appendChild(toolbar);

  const scrollContainer = UWA.createElement('div', {
    class: 'grid-scroll-container',
    styles: {
      height: '400px',
      overflowY: 'auto',
      overflowX: 'hidden',
      border: '1px solid #ccc'
    }
  });

  container.appendChild(scrollContainer); 

  grid = new DataGrid({
    className: 'uwa-table',
    selectable: true,
    multiSelect: true,
    columns: [
      {
        key: 'select',
        text: '<input type="checkbox" class="row-selector" id="select-all-checkbox" />',
        width: 30,
        dataIndex: 'id',
        format: function (val) {
          return `<input type="checkbox" class="row-selector" data-id="${val}" />`;
        }
      },
      {
        key: 'name',
        text: 'Name',
        dataIndex: 'name',
        format: val => `<div>${val || ''}</div>`
      },
      {
        key: 'enterpriseItemNumber',
        text: 'Enterprise Item Number',
        dataIndex: 'enterpriseItemNumber'
      },
      {
        key: 'maturityState',
        text: 'Maturity State',
        dataIndex: 'maturityState',
        format: function (val) {
          const state = val?.split('.').pop() || '';
          const colorMap = {
            'FROZEN': '#008000',
            'IN_WORK': '#0073E6',
            'RELEASED': '#FFA500',
            'OBSOLETE': '#8B0000'
          };
          const bgColor = colorMap[state.toUpperCase()] || '#777';
          return `<span style="display:inline-block;padding:4px 8px;background-color:${bgColor};color:white;border-radius:4px;font-size:12px;">${state.replace(/_/g, ' ')}</span>`;
        }
      },
	  {
        key: 'searchKeyII',
        text: 'Search Key II',
        dataIndex: 'searchKeyII'
      }
    ],
    data: data
  });

  grid.inject(scrollContainer);

  setTimeout(() => {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', function () {
        const checkboxes = widget.body.querySelectorAll('.row-selector');
        checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
      });
    }
  }, 300);
}

function callEINWebServiceAsync(id, newEIN) {
  return new Promise((resolve, reject) => {
    i3DXCompassServices.getServiceUrl({
      platformId: widget.getValue("x3dPlatformId"),
      serviceName: "3DSpace",
      onComplete: function (URL3DSpace) {
        let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;

        const csrfURL = baseUrl + "/resources/v1/application/CSRF";
        console.log("Inside method callEINWebServiceAsync");

        WAFData.authenticatedRequest(csrfURL, {
          method: "GET",
          type: "json",
          onComplete: function (csrfData) {
            const csrfToken = csrfData.csrf.value;
            const csrfHeader = csrfData.csrf.name;
            const engUrl = baseUrl + "/resources/v1/modeler/dseng/dseng:EngItem/" + id + "/dseng:EnterpriseReference";

            const payload = { partNumber: newEIN };
            console.log("Before calling ", engUrl);

            WAFData.authenticatedRequest(engUrl, {
              method: "POST",
              type: "json",
              headers: {
                "Content-Type": "application/json",
                "SecurityContext": "VPLMProjectLeader.Company Name.Common Space",
                [csrfHeader]: csrfToken,
              },
              data: JSON.stringify(payload),
              onComplete: function (response) {
                console.log("EIN Web Service Success:", response);
                resolve(response);
              },
              onFailure: function (error) {
                console.error("EIN Web Service Error:", error);
                reject(error);
              },
            });
          },
          onFailure: function (err) {
            console.error("Failed to fetch CSRF token:", err);
            reject(err);
          },
        });
      },
      onFailure: function (err) {
        console.error("Failed to get 3DSpace URL:", err);
        reject(err);
      },
    });
  });
}


function fetchRunningNumber(sequence,strPartType,callback) {
	  i3DXCompassServices.getServiceUrl({
		  platformId: widget.getValue("x3dPlatformId"),
		  serviceName: "3DSpace",
		  onComplete: function (URL3DSpace) {
			let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
			//if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");

			const csrfURL = baseUrl + "/resources/v1/application/CSRF";

			WAFData.authenticatedRequest(csrfURL, {
			  method: "GET",
			  type: "json",
			  onComplete: function (csrfData) {
				const csrfToken = csrfData.csrf.value;
				const csrfHeader = csrfData.csrf.name;
				csrfVal			=	csrfToken;
				const navigateUrl = baseUrl + "/cvservlet/navigate";
					  WAFData.authenticatedRequest(customConfigurationJSON["CustomURL"].CustomDBDomainURL+'/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType="+strPartType, {
						method: 'GET',
						type: 'json',
						headers: {
						  'Content-Type': 'application/json',
						  'SecurityContext': 'VPLMProjectLeader.Company Name.Common Space',
						  [csrfHeader]: csrfToken
						},
						onComplete: function (response) {
						  var strNextNum	=	response[0].NextSequenceNumber;
						  console.log("Next seq Number==>", strNextNum);
						  callback(strNextNum);
						},
						onFailure: function (error) {
						  console.warn("No running number received.");
						  callback(null);
						}
					  });
			},
			  onFailure: function (err) {
				console.error("Failed to fetch CSRF token:", err);
			  }
			});
		  },
		  onFailure: function () {
			console.error("Failed to get 3DSpace URL");
		  }
			});
	}

  async function fetchLabelsFromIDs(physicalId) {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const csrfURL = baseUrl + "/resources/v1/application/CSRF";

                WAFData.authenticatedRequest(csrfURL, {
                    method: 'GET',
                    type: 'json',
                    onComplete: function (csrfData) {
                        const csrfToken = csrfData.csrf.value;
                        const csrfHeader = csrfData.csrf.name;

                        //const navigateUrl = baseUrl + "/cvservlet/navigate";
                        //const navigateUrl = baseUrl + "/resources/v1/modeler/dslib/dslib:CategorizationClassifiedItem/"+physicalId+"?$mask=dslib:ReverseClassificationMask";
                        const navigateUrl = baseUrl + "/resources/v1/modeler/dslib/dslib:ClassifiedItem/"+physicalId+"?$mask=dslib:ReverseClassificationMask";

                        WAFData.authenticatedRequest(navigateUrl, {
                            method: "GET",
                            type: "json",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                SecurityContext: "ctx::VPLMProjectLeader.Company Name.Common Space",
                                [csrfHeader]: csrfToken
                            },
                            onComplete: function (resp) {
                                try {
									let fullPath = "";
									let nonStandardChild = "";
									let classifiedUnderClassName = "";

									//const classMembers = resp?.member?.[0]?.ParentCategorizationClassification?.member || [];
									const classMembers = resp?.member?.[0]?.ClassificationAttributes?.member || [];

									// Recursive helper: build the full path and detect NON-STANDARD node + its child
									function traverse(node, path = []) {
									  const currentTitle = node.title;
									  const newPath = [currentTitle, ...path]; // Build upward path (bottom → top)

									  // If current node is NON-STANDARD, its immediate child = the first item in path[]
									  if (currentTitle === "NON-STANDARD" || currentTitle === "BOUGHT-OUT") {
										  fullPath = newPath.reverse().join(" → ");
										  nonStandardChild = path[0] || "";
										  classifiedUnderClassName = currentTitle;
										}

									  const parent = node.ParentClassification?.member?.[0];
									  if (parent) traverse(parent, newPath);
									}

									// Go through each classification branch
									classMembers.forEach(member => traverse(member));

									resolve({
									  classFullPath: fullPath || "Not Found",
									  nonStandardChild: nonStandardChild || "Not Found",
									  classifiedUnderClassName:classifiedUnderClassName
									});
                                } catch (e) {
                                    reject("Unexpected navigate response format: " + e);
                                }
                            },
                            onFailure: function (err) {
                                reject("Navigate API failed: " + JSON.stringify(err));
                            }
                        });
                    },
                    onFailure: function (err) {
                        reject("CSRF fetch failed: " + JSON.stringify(err));
                    }
                });
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}
async function fetchCSRF() {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const csrfURL = baseUrl + "/resources/v1/application/CSRF";

                WAFData.authenticatedRequest(csrfURL, {
                    method: 'GET',
                    type: 'json',
                    onComplete: function (csrfData) {
                        const csrfToken = csrfData.csrf.value;
                        const csrfHeader = csrfData.csrf.name;
						resolve(csrfToken);
                    },
                    onFailure: function (err) {
                        reject("CSRF fetch failed: " + JSON.stringify(err));
                    }
                });
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}

async function fetchConnectedDocuments(parentID,parentRelName) {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const csrfURL = baseUrl + "/resources/v1/application/CSRF";

                WAFData.authenticatedRequest(csrfURL, {
                    method: 'GET',
                    type: 'json',
                    onComplete: function (csrfData) {
                        const csrfToken = csrfData.csrf.value;
                        const csrfHeader = csrfData.csrf.name;
						const fetchDocURL = baseUrl + "/resources/v1/modeler/documents/parentId/"+parentID+"?parentRelName="+parentRelName;
						WAFData.authenticatedRequest(fetchDocURL, {
							method: 'GET',
							type: 'json',
							onComplete: function (resp) {
								var data	=	resp.data;
								resolve(data);
							},
							onFailure: function (err) {
								reject("Fetch Document failed: " + JSON.stringify(err));
							}
						});
                    },
                    onFailure: function (err) {
                        reject("CSRF fetch failed: " + JSON.stringify(err));
                    }
                });
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}
async function updateDocument(updatePayLoad) {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const csrfURL = baseUrl + "/resources/v1/application/CSRF";

                WAFData.authenticatedRequest(csrfURL, {
                    method: 'GET',
                    type: 'json',
                    onComplete: function (csrfData) {
                        const csrfToken = csrfData.csrf.value;
                        const csrfHeader = csrfData.csrf.name;
						const updateDocURL = baseUrl + "/resources/v1/modeler/documents";
						WAFData.authenticatedRequest(updateDocURL, {
							method: 'PUT',
							type: 'json',
							data: JSON.stringify(updatePayLoad),
							headers: {
								'Content-Type': 'application/json',
								'ENO_CSRF_TOKEN': csrfToken,
								'SecurityContext': "ctx::VPLMProjectLeader.Company Name.Common Space"
							},
							onComplete: function (resp) {
								console.log("Document Update Successful===>",resp);
								resolve(resp);
							},
							onFailure: function (err) {
								reject("Fetch Document failed: " + JSON.stringify(err));
							}
						});
                    },
                    onFailure: function (err) {
                        reject("CSRF fetch failed: " + JSON.stringify(err));
                    }
                });
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}
async function setSearchKey(physicalId, classifiedUnderClassName) {
    console.log("Inside setSearchKey==>physicalId===>",physicalId);
	var itemResp	=	await fetchPhysicalProductInfo(physicalId);
	console.log("itemResp==>",itemResp);
	partTypeVal = itemResp?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_PartType"] || '';
	searchKeyVal = itemResp?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_SearchKeyII"] || '';
	var prodGrpTypeOrgVal = itemResp?.["dseno:EnterpriseAttributes"]?.["ELGI_CA_ProductGroupType"] || '';
	prodGrpTypeVal	=	prodGrpTypeOrgVal.split("-")[0];
    if (!partTypeVal) return;
	console.log("partTypeVal==>",partTypeVal);
	console.log("classifiedUnderClassName==>",classifiedUnderClassName);
    let newSearchKeyPattern, newsearchKeyVal;
	switch(classifiedUnderClassName){
		case "NON-STANDARD" :
		{
			console.log("Inside case NON-STANDARD!!!!");
			switch(partTypeVal){
				case "Assy":
				case "Assy_EG-EN":
					if(prodGrpTypeVal && prodGrpTypeVal.toLowerCase() !== 'unassigned')
						newSearchKeyPattern = "S" + prodGrpTypeVal;
					break;
				case "SubAssy":
				case "SubAssy_EG-EN":
					console.log("Inside SubAssy case");
					console.log("prodGrpTypeVal===>",prodGrpTypeVal);
					if(prodGrpTypeVal && prodGrpTypeVal.toLowerCase() !== 'unassigned'){
						console.log("Inside if prodGrpTypeVal && prodGrpTypeVal.toLowerCase() !== 'unassigned'");
						newSearchKeyPattern = "X" + prodGrpTypeVal;
					}
					break;
				case "SubSubAssy":
				case "SubSubAssy_EGEN":
					if(prodGrpTypeVal && prodGrpTypeVal.toLowerCase() !== 'unassigned')
						newSearchKeyPattern = "A" + prodGrpTypeVal;
					break;
				case "NonStdAssy":
					if(prodGrpTypeVal && prodGrpTypeVal.toLowerCase() !== 'unassigned')
						newSearchKeyPattern = "Z" + prodGrpTypeVal;
					break;
				default:
					newsearchKeyVal = productName;
					break;
			}
			break;
		}
		case "BOUGHT-OUT" :
		{
			newsearchKeyVal = productName;
			break;
		}
	}
    

    //if (!searchKeyVal || !newSearchKeyPattern) return;
	if(searchKeyVal){
		if(classifiedUnderClassName === "NON-STANDARD"){
			const existingSearchKeyPattern = searchKeyVal.slice(0, -4);
			console.log("existingSearchKeyPattern==>",existingSearchKeyPattern);
			console.log("newSearchKeyPattern==>",newSearchKeyPattern);
			try {
				if(newSearchKeyPattern && newSearchKeyPattern !== existingSearchKeyPattern){
					const runningNo = await fetchRunningNumberAsync(newSearchKeyPattern, "SearchKey");
					newsearchKeyVal = newSearchKeyPattern + runningNo;

					const latestCSRF = await fetchCSRF();
					if(!latestCSRF) return;

					console.log("Before calling fetchPhysicalProductInfo");
					const fetchResponse = await fetchPhysicalProductInfo(physicalId);

					if(fetchResponse){
						const cestamp = fetchResponse?.cestamp || '';
						console.log("cestamp===>",cestamp);
						const updateSearchKeyPayload = {
							"dseno:EnterpriseAttributes": { "ELGI_CA_SearchKeyII": newsearchKeyVal },
							"cestamp": cestamp
						};
						await updatePhysicalProduct(physicalId, latestCSRF, updateSearchKeyPayload);
						//updatedSKII = newsearchKeyVal;
						//console.log("updatedSKII = newsearchKeyVal;====>",updatedSKII);
						//return Promise.resolve("Update successful");
					}else {
						return Promise.reject("Failed to fetch physical product info");
					}
				}else if(newsearchKeyVal && newsearchKeyVal !== searchKeyVal){
					const latestCSRF = await fetchCSRF();
					if(!latestCSRF) return;

					//console.log("Before calling fetchPhysicalProductInfo");
					const fetchResponse = await fetchPhysicalProductInfo(physicalId);

					if(fetchResponse){
						const cestamp = fetchResponse?.cestamp || '';
						console.log("cestamp===>",cestamp);
						const updateSearchKeyPayload = {
							"dseno:EnterpriseAttributes": { "ELGI_CA_SearchKeyII": newsearchKeyVal },
							"cestamp": cestamp
						};
						await updatePhysicalProduct(physicalId, latestCSRF, updateSearchKeyPayload);
						/* updatedSKII = newsearchKeyVal;
						console.log("updatedSKII = newsearchKeyVal;====>",updatedSKII); */
						//return Promise.resolve("Update successful");
					}else {
						return Promise.reject("Failed to fetch physical product info");
					}
				}/* else{
					updatedSKII		=	searchKeyVal;
				} */

			} catch(err) {
				console.error("Error in setSearchKey:", err);
				return Promise.reject(err);
			}
		}
	}else{
		if(newSearchKeyPattern){
			const runningNo = await fetchRunningNumberAsync(newSearchKeyPattern, "SearchKey");
			newsearchKeyVal = newSearchKeyPattern + runningNo;

			const latestCSRF = await fetchCSRF();
			if(!latestCSRF) return;

			console.log("Before calling fetchPhysicalProductInfo");
			const fetchResponse = await fetchPhysicalProductInfo(physicalId);

			if(fetchResponse){
				const cestamp = fetchResponse?.cestamp || '';
				console.log("cestamp===>",cestamp);
				const updateSearchKeyPayload = {
					"dseno:EnterpriseAttributes": { "ELGI_CA_SearchKeyII": newsearchKeyVal },
					"cestamp": cestamp
				};
				await updatePhysicalProduct(physicalId, latestCSRF, updateSearchKeyPayload);
				/* updatedSKII = newsearchKeyVal;
				console.log("updatedSKII = newsearchKeyVal;====>",updatedSKII); */
				//return Promise.resolve("Update successful");
			}else {
				return Promise.reject("Failed to fetch physical product info");
			}
		}else if(newsearchKeyVal){
			console.log("BOUGHT-OUT Logic");
			const latestCSRF = await fetchCSRF();
			if(!latestCSRF) return;

			//console.log("Before calling fetchPhysicalProductInfo");
			const fetchResponse = await fetchPhysicalProductInfo(physicalId);

			if(fetchResponse){
				const cestamp = fetchResponse?.cestamp || '';
				console.log("cestamp===>",cestamp);
				const updateSearchKeyPayload = {
					"dseno:EnterpriseAttributes": { "ELGI_CA_SearchKeyII": newsearchKeyVal },
					"cestamp": cestamp
				};
				await updatePhysicalProduct(physicalId, latestCSRF, updateSearchKeyPayload);
				/* updatedSKII = newsearchKeyVal;
				console.log("updatedSKII = newsearchKeyVal;====>",updatedSKII); */
				//return Promise.resolve("Update successful");
			}else {
				return Promise.reject("Failed to fetch physical product info");
			}
		}
	}
	console.log("newsearchKeyVal===>",newsearchKeyVal);
	console.log("searchKeyVal===>",searchKeyVal);
	if (newsearchKeyVal !== searchKeyVal) {
		console.log("Inside ((searchKeyVal !== updatedSKII) && updatedSKII)");

		try {
			const specDocArr = await fetchConnectedDocuments(physicalId, "SpecificationDocument");
			console.log("specDocArr==>", specDocArr);

			for (const specDoc of specDocArr) {
				const specDocID = specDoc.id;
				const specDocType = specDoc.dataelements.ELGI_CA_DocumentType;

				if (specDocID && specDocType?.toLowerCase() === "specsheet") {
					console.log("specDocType===>",specDocType);
					const subDocArr = await fetchConnectedDocuments(specDocID, "Reference Document");
					console.log("subDocArr==>", subDocArr);

					for (const subDoc of subDocArr) {
						const subDocID = subDoc.id;
						const subDocType = subDoc.dataelements.ELGI_CA_DocumentType;

						if (subDocID && subDocType?.toLowerCase() === "subsheet") {
							console.log("subDocType===>",subDocType);
							const updatePayload = {
								data: [
									{
										id: subDocID,
										type: "Document",
										updateAction: "MODIFY",
										dataelements: {
											ELGI_CA_DocumentName: newsearchKeyVal
										}
									}
								]
							};

							console.log(`Updating subsheet document ${subDocID}...`);
							await updateDocument(updatePayload);
						}
					}
				}
			}
		} catch (err) {
			console.error("Error while updating connected documents:", err);
		}
	}
	console.log("SearchKey Update done!!!");
	return Promise.resolve("Update successful");
}
						
function fetchRunningNumberAsync(pattern, type) {
    return new Promise((resolve, reject) => {
        fetchRunningNumber(pattern, type, function(runningNo) {
            if (runningNo) resolve(runningNo);
            else reject("Failed to get running number");
        });
    });
}

  async function updatePhysicalProduct(physicalId, csrfVal, updateSearchKeyPayload) {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const updateSKIIUrl = baseUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + physicalId;;
				WAFData.authenticatedRequest(updateSKIIUrl, {
					method: 'PATCH',
					type: 'json',
					headers: {
						'Content-Type': 'application/json',
						'ENO_CSRF_TOKEN': csrfVal,
						'SecurityContext': "VPLMProjectLeader.Company Name.Common Space",
						'Accept': 'application/json'
					},
					data: JSON.stringify(updateSearchKeyPayload),
					onComplete: function (response) {
						console.log("Physical Product Update response==>",response);
						resolve(response);
					},
					onFailure: function (e, t) {
						console.error("error in updating Physical Product ===>", e.message);
						console.error("details ===>", t);
						reject(e.message);
					},
					onTimeout: function () {
						const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
						console.error("Timeout error:", timeoutError);
						reject(timeoutError);
					}
				});
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}

async function fetchPhysicalProductInfo(physicalid) {
    return new Promise((resolve, reject) => {
        i3DXCompassServices.getServiceUrl({
            platformId: platformId,
            serviceName: '3DSpace',
            onComplete: function (URL3DSpace) {
                let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
               // if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");
				domainURL	  =	baseUrl;
                const csrfURL = baseUrl + "/resources/v1/application/CSRF";

                WAFData.authenticatedRequest(csrfURL, {
                    method: 'GET',
                    type: 'json',
                    onComplete: function (csrfData) {
                        const csrfToken = csrfData.csrf.value;
                        const csrfHeader = csrfData.csrf.name;
						const fetchURL = baseUrl + "/resources/v1/modeler/dseng/dseng:EngItem/"+physicalid+"?$mask=dsmveng:EngItemMask.Details";

						WAFData.authenticatedRequest(fetchURL, {
							method: 'GET',
							type: 'json',
							headers: {
							  "Accept": "application/json",
							  "x-requested-with": "xmlhttprequest",
							  "SecurityContext": "VPLMProjectLeader.Company Name.Common Space"
							},
							onComplete: function (response) {
								resolve(response.member[0]);
							},
							onFailure: function (err) {
								reject("VPMReference fetch failed: " + JSON.stringify(err));
							}
						});
                    },
                    onFailure: function (err) {
                        reject("CSRF fetch failed: " + JSON.stringify(err));
                    }
                });
            },
            onFailure: function () {
                reject("3DSpace URL fetch failed");
            }
        });
    });
}
function fetchLibraryForPartAsync(id) {
  return new Promise((resolve, reject) => {
    fetchLibraryForPart(id, (info) => resolve(info));
  });
}

 function fetchLibraryForPart(physicalId, callback) {
  const platformId = widget.getValue("x3dPlatformId");
  if(physicalId){
	  i3DXCompassServices.getServiceUrl({
		platformId: platformId,
		serviceName: "3DSpace",
		onComplete: function(URL3DSpace) {
		  let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
		  //if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");

		  const url = baseUrl + "/resources/v1/modeler/dslib/dslib:ClassifiedItem/" + physicalId + "?$mask=dslib:ClassificationAttributesMask";

		  WAFData.authenticatedRequest(url, {
			method: "GET",
			type: "json",
			headers: {
			  "Accept": "application/json",
			  "x-requested-with": "xmlhttprequest",
			  "SecurityContext": "VPLMProjectLeader.Company Name.Common Space"
			},
			onComplete: function(data) {
			  try {
				console.log("Classification Data:", data);
				const mainMember = data?.member?.[0];
				if (!mainMember) return callback({ classId: "", attributes: {} });

				const classAttr = mainMember.ClassificationAttributes?.member?.[0];
				if (!classAttr) return callback({ classId: "", attributes: {} });

				const classId = classAttr.ClassID || "";
				const attributes = {};

				if (Array.isArray(classAttr.Attributes)) {
				  classAttr.Attributes.forEach(attr => {
					if (attr.name) {
					  attributes[attr.name] = attr.value || "";
					}
				  });
				}

				callback({ classId, attributes });

			  } catch (err) {
				console.error("Error parsing classification response", err);
				callback({ label: "", attributes: {} });
			  }
			},
			onFailure: function(err) {
			  console.warn("Failed to get classification for " + physicalId, err);
			  callback({ label: "", attributes: {} });
			}
		  });
		},
		onFailure: function() {
		  console.error("Could not get 3DSpace URL");
		  callback({ label: "", attributes: {} });
		}
	 });
  }
}

  function fetchChildren(pid, level, parentRow, callback) {
	  console.log("Fetched children for", pid, parentRow);
    i3DXCompassServices.getServiceUrl({
      platformId: widget.getValue("x3dPlatformId"),
      serviceName: "3DSpace",
      onComplete: function (URL3DSpace) {
        let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;
        //if (baseUrl.endsWith("/3dspace")) baseUrl = baseUrl.replace("/3dspace", "");

        const csrfURL = baseUrl + "/resources/v1/application/CSRF";

        WAFData.authenticatedRequest(csrfURL, {
          method: "GET",
          type: "json",
          onComplete: function (csrfData) {
            const csrfToken = csrfData.csrf.value;
            const csrfHeader = csrfData.csrf.name;

            const postUrl = baseUrl + "/cvservlet/progressiveexpand/v2?tenant=" + platformId + "&output_format=cvjson";

            const postData = {
              batch: {
                expands: [{
                  aggregation_processors: [{
                    truncate: {
                      max_distance_from_prefix: 1,
                      prefix_filter: {
                        prefix_path: [{ physical_id_path: [pid] }]
                      }
                    }
                  }],
                  filter: {
                    and: {
                      filters: [
                        {
                          prefix_filter: {
                            prefix_path: [{ physical_id_path: [pid] }]
                          }
                        },
                        {
                          and: {
                            filters: [{
                              sequence_filter: {
                                sequence: [{
                                  uql: '((flattenedtaxonomies:"reltypes/VPMInstance") OR (flattenedtaxonomies:"reltypes/VPMRepInstance") OR (flattenedtaxonomies:"reltypes/SpecificationDocument")) AND (NOT (ds6wg_58_synchroebomext_46_v_95_inebomuser:"FALSE"))'
                                }]
                              }
                            }]
                          }
                        }
                      ]
                    }
                  },
                  graph: {
                   
                    descending_condition_relation: {
                      uql: 'NOT (flattenedtaxonomies:"reltypes/XCADBaseDependency") AND ((flattenedtaxonomies:"reltypes/VPMInstance") OR (flattenedtaxonomies:"reltypes/VPMRepInstance") OR (flattenedtaxonomies:"reltypes/SpecificationDocument"))'
                    }
                  },
                  label: "expand-root-" + Date.now(),
                  root: {
                    physical_id: pid
                  }
                }]
              },
              outputs: {
                format: "entity_relation_occurrence",
                select_object: ["ds6w:label", "ds6w:created", "type", "physicalid","ds6wg:EnterpriseExtension.V_PartNumber","ds6w:status"],
                select_relation: ["ds6w:type", "type", "physicalid"]
              }
            };

            WAFData.authenticatedRequest(postUrl, {
              method: "POST",
              type: "json",
              headers: {
                "Content-Type": "application/json",
                'SecurityContext': 'VPLMProjectLeader.Company Name.APTIV INDIA',
                [csrfHeader]: csrfToken
              },
              data: JSON.stringify(postData),
              onComplete: function (resp) {
                const children = [];
				const results = resp.results || [];

				const rootObj = results.find(item => item.resourceid === pid && item.type === "VPMReference");
				console.log("rootObj:"+rootObj);
				console.log("rowsMap[pid]:"+rowsMap[pid]);
				console.log("pid:"+pid);
				if (rootObj) {
				  const rootPartNumber = rootObj["ds6wg:EnterpriseExtension.V_PartNumber"]
					|| (rootObj.attributes ? getAttributeValue(rootObj.attributes, "ds6wg:EnterpriseExtension.V_PartNumber") : '');
					console.log("rootPartNumber:"+rootPartNumber);
					if (rowsMap[pid]) {
   
					rowsMap[pid].enterpriseItemNumber = rootPartNumber;
					rowsMap[pid].maturityState = rootObj["ds6w:status"];
					parentRow = rowsMap[pid];
					} else {
				   
					const rootRow = {
					  id: rootObj.resourceid,
					  name: rootObj["ds6w:label"] || "Root",
					  type: rootObj["type"] || "VPMReference",
					  created: rootObj["ds6w:created"] || new Date().toISOString(),
					  level: 0,
					  enterpriseItemNumber: rootPartNumber,
					  maturityState: rootObj["ds6w:status"] ,
					  hasChildren: true,
					  _expanded: true,
					  expandcol: '',
					  parentId: null
					};
					rowsMap[rootObj.resourceid] = rootRow;
					parentRow = rootRow;
				  }
				}
				const objectMap = {};
				results.forEach(item => {
				  if (item.type === "VPMReference") {
					objectMap[item.resourceid] = item;
				  }
				});

				results.forEach(item => {
				  if (item.type === "VPMInstance" && item.from === pid) {
					const childObj = objectMap[item.to];
					if (childObj) {
					const partNumber = childObj["ds6wg:EnterpriseExtension.V_PartNumber"]
								|| (childObj.attributes ? getAttributeValue(childObj.attributes, "ds6wg:EnterpriseExtension.V_PartNumber") : '');
						console.log("partNumber=="+partNumber);
					  const row = {
						id: childObj.resourceid,
						name: childObj["ds6w:label"],
						type: childObj["type"],
						created: childObj["ds6w:created"],
						level: level,
						enterpriseItemNumber: partNumber,
						maturityState: childObj["ds6w:status"] ,
						hasChildren: true,
						_expanded: true,
						expandcol: '', 
						parentId: parentRow ? parentRow.id : null
					  };
					  children.push(row);
					  rowsMap[childObj.resourceid] = row;
					}
				  }
				});

               parentRow._children = children || [];
				parentRow._expanded = true;

				if (!children || children.length === 0) {
				  callback && callback();  
				} else {
				  let remaining = children.length;
				  children.forEach(child => {
					fetchChildren(child.id, child.level + 1, child, function () {
					  remaining--;
					  if (remaining === 0) {
						callback && callback();
					  }
					});
				  });
				}
              },
              onFailure: function (err) {
                console.error("Failed to fetch structure from progressiveexpand:", err);
              }
            });
          },
          onFailure: function (err) {
            console.error("Failed to fetch CSRF token:", err);
          }
        });
      },
      onFailure: function () {
        console.error("Failed to get 3DSpace URL");
      }
    });
  }
  
  function getAttributeValue(attributesArray, attrName) {
	  for (let i = 0; i < attributesArray.length; i++) {
		if (attributesArray[i].name === attrName) {
		  return attributesArray[i].value;
		}
	  }
	  return '';
	}
  function expandChildren(row) {
    if (!row._children) {
      fetchChildren(row.id, row.level + 1, row);
    } else {
      row._expanded = true;
      updateDataGrid();
    }
  }

  function collapseChildren(row) {
    row._expanded = false;
    updateDataGrid();
  }

  function updateDataGrid() {
  const result = [];

  function addRowRecursive(row) {
    result.push(row);
    if (row._expanded && row._children) {
      row._children.forEach(addRowRecursive);
    }
  }

  Object.values(rowsMap).forEach((row) => {
    if (!row.parentId) addRowRecursive(row);
  });
 if (window._parentContainer) {
        createGrid(result, window._parentContainer);
    }
}
function injectRemoteUIKitCSS() {
				const style = document.createElement("style");
					style.textContent = `
					.grid-scroll-container {
					  max-height: 400px;
					  overflow-y: auto;
					  overflow-x: hidden;
					}

					.uwa-table {
					  width: 100%;
					  border-collapse: collapse;
					}

					/* Header should NOT be sticky */
					.uwa-table thead th {
					  position: relative;
					  background: #d3d3d3;
					  z-index: 1;
					  text-align: left;
					  vertical-align: middle;
					  padding: 8px;
					}

					.uwa-table thead th:first-child {
					  text-align: center;
					  width: 40px;
					}

					/* Data cells */
					.uwa-table td {
					  text-align: left !important;
					  vertical-align: middle;
					  padding: 6px 10px;
					  border: 1px solid #ddd;
					}

					.uwa-table td:first-child {
					  text-align: center;
					}

					.uwa-table input[type="checkbox"] {
					  width: 16px;
					  height: 16px;
					  cursor: pointer;
					}

					/* Row striping */
					.uwa-table .dataRow:nth-child(even) {
					  background-color: #f5f5f5;
					}

					.uwa-table .dataRow:nth-child(odd) {
					  background-color: #ffffff;
					}
					`;
					document.head.appendChild(style);

			  const link = document.createElement("link");
			  link.rel = "stylesheet";
			  link.href = "/resources/"+widget.getValue("x3dPlatformId")+"/en/webapps/UIKIT/UIKIT.css";
			  document.head.appendChild(link);
			  
}
  return myWidget;
});
