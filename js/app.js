$(document).foundation();

// Firebase reference for users
var ref = new Firebase("https://whitney.firebaseio.com/users");

// Firebase reference for acronyms
var refAcronym = new Firebase("https://whitney.firebaseio.com/acronyms");

var schoolAcronyms = {};

refAcronym.on("value", function(snapshot) {

	// Clear current acronyms
	schoolAcronyms = {};

	console.log("Acronyms");
	console.log(snapshot.val());

	var data = snapshot.val();

	for (var key in data) {
		if (data.hasOwnProperty(key)) {

			var short = data[key]["short"];
			var full = data[key]["full"];

			schoolAcronyms[short] = full;
		}
	}

	console.log(schoolAcronyms);

}, function (errorObject) {
	console.log("The read failed: " + errorObject.code);
});


// Add event listener for form
var form = document.getElementById("whitneyForm");

if (form.addEventListener) {
    form.addEventListener("submit", processForm, false);  //Modern browsers

} else if (form.attachEvent) {
    form.attachEvent('onsubmit', processForm);            //Old IE
}

$(document).ready(function() {
// Prefil stuff for dev'ing
	// $("input[name='First name']").val("aa");
	// $("input[name='Last name']").val("bb");
	// $("input[name='Email']").val("c@c.com");
	// $("input[name='School/Organization/Other']").val("abc school");

	// Check if user is logged in
	var user = ref.getAuth();

	if (user != null) {
		$("#login").addClass("hide");
		$(".admin-only").removeClass("hide");
	}

	console.log(user);

	// Use enter as tab key where appropriate
	$("input").keypress(function(e) {
		if (e.which == 13) {
       		// $(this).next('input').focus();
       		$(this).parent().next("label").children("input").focus();
       		e.preventDefault();
       	}
       });

	// Setup typeahead on school input
	$("#schoolInput").typeahead({
		hint: false,
		// highlight: true,
		minLength: 1,
		autoselect: true
	},
	{
		name: "schools",
		source: substringMatcher(schools)
	});

	$("#schoolInput").on("focus", function() {
		$("html, body").animate({
        	scrollTop: $("#schoolInput").offset().top - 40
        }, 500);
	});

	// On blur validate the email very loosely. Has to be outside of Foundation Abide because of issue with type=email inputs
	$("#emailInput").on("blur", function() {
		var email = $("#emailInput").val();

		if (emailValidator(email) == false) {
			$("#emailInput").addClass("is-invalid-input");
			$("#emailLabel").addClass("is-invalid-label");

		}
	});

	// On blur go through and check for acronyms
	$("#schoolInput").on("blur", function() {
		var schoolInput = $("#schoolInput").val();

		schoolInput = schoolInput.toUpperCase();
		console.log(schoolInput);

		if (schoolInput in schoolAcronyms) {
			console.log(true);
			console.log(schoolAcronyms[schoolInput]);

			$("#schoolInput").val(schoolAcronyms[schoolInput]);
			$("#schoolInput").attr("value", schoolAcronyms[schoolInput]);

		} else {
			// Try it lowercase, though this is a little odd
			schoolInput = schoolInput.toLowerCase();

			if (schoolInput in schoolAcronyms) {
				console.log(true);
				console.log(schoolAcronyms[schoolInput]);

				$("#schoolInput").val(schoolAcronyms[schoolInput]);
				$("#schoolInput").attr("value", schoolAcronyms[schoolInput]);
			}
		}

	});

	// Login handling
	$("#loginForm").on("submit", function(e) {
		e.preventDefault();

		var loginEmail = $("input[name='loginEmail'").val();
		var loginPassword = $("input[name='loginPassword'").val();

		ref.authWithPassword({
			email : loginEmail,
			password : loginPassword

		}, function (error, authData) {
			if (error) {
				console.log("Login Failed!", error);

			} else {
				console.log("Authenticated successfully with payload:", authData);

				$("#login").addClass("hide");
				$(".admin-only").removeClass("hide");
				$("#loginModal").foundation("close");
			}
		});

	});

	// Handle logging out
	$("#logout").on("click", function() {
		console.log("Logged out");
		ref.unauth();

		$("#login").removeClass("hide");
		$(".admin-only").addClass("hide");
	});

	// Handle showing full student list
	$("#list").on("click", function() {

		$("#listTable tbody").empty();

		ref.once("value", function(snapshot) {
			// ref.orderByChild("time").on("value", function(snapshot) {
				var data = snapshot.val();

				for (var key in data) {

					console.log(key);

					if (data.hasOwnProperty(key)) {
						var time = data[key]["time"];
						var firstName = data[key]["firstName"];
						var lastName = data[key]["lastName"];
						var email = data[key]["email"];
						var school = data[key]["school"];
						var hearAbout = data[key]["hearAbout"];
						var grade = data[key]["grade"];
						var timesWhitney = data[key]["timesWhitney"];
						var timesStudio = data[key]["timesStudio"];

						var date = time.substr(0, time.indexOf(' '));

						$("#listTable tbody").prepend("<tr><td>" + time + "</td><td>" + firstName + "</td><td>" + lastName + "</td><td>" + email + "</td><td>" + school + "</td><td>" + hearAbout + "</td><td>" + grade + "</td><td>" + timesWhitney + "</td><td>" + timesStudio + "</td><td><button class='alert button deleteUser' data-key='" + key + "'>Delete</button></td></tr>");

					}
				}
			});

		$("#listModal").foundation("open");

	});

	// Handle deleting user
	$("body").on("click", ".deleteUser", function() {
		var user = $(this).data("key");

		ref.child(user).set(null);
		$(this).parents("tr").remove();
	});

	// Handle showing stats
	$("#stats").on("click", function() {

		$("#statsTable tbody").empty();

		//ref.once? does this keep opening new channels or stick to one?
		ref.orderByChild("time").on("value", function(snapshot) {
			// console.log(snapshot.val());

			var tally = {};

			var data = snapshot.val();

			for (var key in data) {
				if (data.hasOwnProperty(key)) {

					var time = data[key]["time"];
					var school = data[key]["school"];
					var date = time.substr(0, time.indexOf(' '));

					// Check if the date is already in the tally
					if (date in tally) {
						// If the school is already in the tally for the date, update the count
						if (school in tally[date]) {
							tally[date][school] += 1;

							// If the school is not in the tally for the date, start the count
						} else {
							tally[date][school] = {};
							tally[date][school] = 1;
						}

						// If it isn't, add the date and the school, start the count
					} else {
						tally[date] = {};
						tally[date][school] = {};
						tally[date][school] = 1;
					}

				}
			}

			console.log("Tallying up");
			for (var key in tally) {
				if (tally.hasOwnProperty(key)) {

					for (var school in tally[key]) {
						console.log(key);
						console.log(school);
						console.log(tally[key][school]);

						$("#statsTable tbody").prepend("<tr><td>" + key + "</td><td>" + school + "</td><td>" + tally[key][school] + "</td></tr>");

					}

				}
			}

			console.log("Tally");
			console.log(tally);

			$("#statsModal").foundation("open");

		}, function (errorObject) {
			console.log("The read failed: " + errorObject.code);
		});

	});

	// Handle acronyms
	$("#acronyms").on("click", function() {
		$("#acronymsTable tbody").empty();

		refAcronym.once("value", function(snapshot) {
			// refAcronym.orderByChild("short").on("value", function(snapshot) {
				var data = snapshot.val();

				for (var key in data) {

					if (data.hasOwnProperty(key)) {
						var short = data[key]["short"];
						var full = data[key]["full"];

						$("#acronymsTable tbody").append("<tr><td>" + short + "</td><td>" + full + "</td><td><button class='alert button deleteAcronym' data-short='" + short + "'>Delete</button></td></tr>");

					}
				}
  		// do some stuff once
  	});

		$("#acronymsModal").foundation("open");
	});

	// Handle deleting acronym
	$("body").on("click", ".deleteAcronym", function() {
		var acronym = $(this).data("short");

		refAcronym.child(acronym).set(null);
		$(this).parents("tr").remove();
	});

	// Handle adding acronym
	$("#addAcronym").on("click", function(e) {
		var short = $("#short").val();
		var full = $("#full").val();

		if (short == '' || full == '') {
			console.log("nope");

		} else {

			refAcronym.child(short).set({
				short: short,
				full: full
			})

			// Clear form
			$("#short").val("");
			$("#full").val("");

			$("#acronymsTable tbody").append("<tr><td>" + short + "</td><td>" + full + "</td><td><button class='alert button deleteAcronym' data-short='" + short + "'>Delete</button></td></tr>");

		}

	});


});

// Process the form on submit
function processForm(e) {
	e.preventDefault();

	showLoader(true);

	var time = getFormattedDate();
	var firstName = $("input[name='First name']").val();
	var lastName = $("input[name='Last name']").val();
	var email = $("input[name='Email']").val();
	var school = $("input[name='School/Organization/Other']").val();

	var hearAbout = $("input[name='How did you hear about Open Studio for Teens?']:checked").val();
	var grade = $("input[name='Grade']:checked").val();
	var timesWhitney = $("input[name='How many times have you been to the Whitney?']:checked").val();
	var timesStudio = $("input[name='How many times have you attended Open Studio?']:checked").val();

	var emailValid = emailValidator(email);

	// Validate
	if (firstName == '' || lastName == '' || email == '' || school == '' || hearAbout == '' || grade == '' || timesWhitney == '' || timesStudio == '' || !emailValid) {

		console.log("Validation failed");
		$("div[data-abide-error]").show();

		if (!emailValid) {
			$("#emailInput").addClass("is-invalid-input");
			$("#emailLabel").addClass("is-invalid-label");
		}

		showLoader(false);

	} else {
		ref.push({
			time: time,
			firstName: firstName,
			lastName: lastName,
			email: email,
			school: school,
			hearAbout: hearAbout,
			grade: grade,
			timesWhitney: timesWhitney,
			timesStudio: timesStudio
		});

		// Push answers to google sheets
		pushToGoogle(time);
	}

}

// Push the form data to Google Sheets
function pushToGoogle(time) {
	console.log(time);
	var serializedData = $("#whitneyForm").serialize() + "&Timestamp=" + time;

	console.log(serializedData);

	$.ajax({
		// url: "https://script.google.com/macros/s/AKfycbzP-0Yap6_ATFVXKyEubucQRmiI0E8hdSRLl8bocpLassYXr5Iy/exec",
		url: "https://script.google.com/macros/s/AKfycbwn9UxQvWSfxuCj8wdP3WVgusPlWCfUYuSTKTOk40Brw3ceZiU/exec",
		type: "post",
		data: serializedData,
		statusCode: {
			0: function () {
				// Even though Safari coming back as a 405/0, the post to Google Sheets was successful.
				// Problem related to CORS, though it all actually works, and doesn't error in Chrome. So just ignore it.
				console.log("0");

				$("#thanksModal").foundation("open");
				showLoader(false);

				setTimeout(function(){
					$("#thanksModal").foundation("close");
					window.scrollTo(0, 0);
					location.reload();
				}, 2000);
			},
			200: function () {
				console.log("200");

				$("#thanksModal").foundation("open");
				showLoader(false);

				setTimeout(function(){
					$("#thanksModal").foundation("close");
					window.scrollTo(0, 0);
					location.reload();
				}, 2000);
			}
		}
	});

}

// Show/hide submit button changes and other loading/submitting elements
function showLoader(bool) {
	if (bool == true) {
		$("#formSubmit").addClass("disabled");
		$(".loader").removeClass("hide");
		$("#formSubmit").attr("value", "");

	} else {
		$(".loader").addClass("hide");
		$("#formSubmit").removeClass("disabled");
		$("#formSubmit").attr("value", "Submit");
	}
}

function emailValidator(email) {
	var re = /\S+@\S+\.\S+/;

	if (re.test(email)) {
		return true;

	} else {
		return false;
	}
}

// Format date
function getFormattedDate() {
	var date = new Date();

	var month = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var min = date.getMinutes();
	var sec = date.getSeconds();

	month = (month < 10 ? "0" : "") + month;
	day = (day < 10 ? "0" : "") + day;
	hour = (hour < 10 ? "0" : "") + hour;
	min = (min < 10 ? "0" : "") + min;
	sec = (sec < 10 ? "0" : "") + sec;

	var str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec;

	return str;
}

// Match string portions
var substringMatcher = function(strs) {
	return function findMatches(q, cb) {
		var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
    	if (substrRegex.test(str)) {
    		matches.push(str);
    	}
    });

    cb(matches);
};
};

// Need to do a key/pair of common acronyms and real names
// var schoolAcronyms = {
// 	"Brooklyn Tech" : "Brooklyn Technical High School",
// 	"BTHS" : "Brooklyn Technical High School",
// 	"FSSA" : "Frank Sinatra School of the Arts",
// 	"HSAS" : "High School of American Studies at Lehman College",
// 	"HSAS@Lehman" : "High School of American Studies at Lehman College",
// 	"HSAS @ Lehman" : "High School of American Studies at Lehman College",
// 	"MCSM" : "Manhattan Center for Science and Mathematics",
// 	"PPAS" : "Professional Performing Arts High School",
// 	"PCS" : "Professional Children's School",
// 	"SOTF" : "School of the Future High School",
// 	"Stuyvesant" : "Stuyvesant High School"
// };

// Probably incomplete list of high schools, needs to be cleaned up
var schools = [
"47 The American Sign Language and English Secondary School",
"A. Philip Randolph Campus High School",
"Abraham Lincoln High School",
"Academy for Careers in Television and Film",
"Academy for College Preparation and Career Exploration: A College Board School",
"Academy for Conservation and the Environment",
"Academy for Environmental Leadership",
"Academy for Health Careers",
"Academy for Language and Technology",
"Academy for Scholarship and Entrepreneurship: A College Board School",
"Academy for Social Action: A College Board School",
"Academy for Young Writers",
"Academy of American Studies",
"Academy of Business and Community Development",
"Academy of Finance and Enterprise",
"Academy of Hospitality and Tourism",
"Academy of Innovative Technology",
"Academy of Medical Technology: A College Board School",
"Academy of Urban Planning",
"ACORN Community High School",
"Alfred E. Smith Career and Technical Education High School",
"All City Leadership Secondary School",
"Antonia Pantoja Preparatory Academy: A College Board School",
"Archimedes Academy for Math, Science and Technology Applications",
"Art and Design High School",
"Arts & Media Preparatory Academy",
"August Martin High School",
"Automotive High School",
"Aviation Career & Technical Education High School",
"Baccalaureate School for Global Education",
"Banana Kelly High School",
"Bard High School Early College",
"Bard High School Early College Queens",
"Baruch College Campus High School",
"Bayside High School",
"Beacon High School",
"Bedford Academy High School",
"Belmont Preparatory High School",
"Benjamin Banneker Academy",
"Benjamin N. Cardozo High School",
"Boys and Girls High School",
"Bread & Roses Integrated Arts High School",
"Bronx Academy of Health Careers",
"Bronx Aerospace High School",
"Bronx Bridges High School",
"Bronx Career and College Preparatory High School",
"Bronx Center for Science and Mathematics",
"Bronx Collegiate Academy",
"Bronx Design and Construction Academy",
"Bronx Early College Academy for Teaching & Learning",
"Bronx Engineering and Technology Academy",
"Bronx Envision Academy",
"Bronx Guild",
"Bronx Health Sciences High School",
"Bronx High School for Law and Community Service",
"Bronx High School for Medical Science",
"Bronx High School for the Visual Arts",
"Bronx High School for Writing and Communication Arts",
"Bronx High School of Business",
"Bronx High School of Science",
"Bronx International High School",
"Bronx Lab School",
"Bronx Latin",
"Bronx Leadership Academy High School",
"Bronx Leadership Academy II High School",
"Bronx School for Law, Government and Justice",
"Bronx School of Law and Finance",
"Bronx Studio School for Writers and Artists",
"Bronx Theatre High School",
"Bronxdale High School",
"Brooklyn Academy of Science and the Environment",
"Brooklyn College Academy",
"Brooklyn Collegiate: A College Board School",
"Brooklyn Community High School of Communication, Arts and Media",
"Brooklyn Frontiers High School",
"Brooklyn Generation School",
"Brooklyn High School for Law and Technology",
"Brooklyn High School of the Arts",
"Brooklyn International High School",
"Brooklyn Lab School",
"Brooklyn Latin School, The",
"Brooklyn Preparatory High School",
"Brooklyn School for Global Studies",
"Brooklyn School for Music & Theatre",
"Brooklyn Secondary School for Collaborative Studies",
"Brooklyn Studio Secondary School",
"Brooklyn Technical High School",
"Brooklyn Theatre Arts High School",
"Bushwick Leaders High School for Academic Excellence",
"Bushwick School for Social Justice",
"Business of Sports School",
"Business, Computer Applications & Entrepreneurship High School",
"Cambria Heights Academy",
"Celia Cruz Bronx High School of Music, The",
"Central Park East High School",
"Channel View School for Research",
"Chelsea Career and Technical Education High School",
"Choir Academy of Harlem",
"City College Academy of the Arts",
"City Polytechnic High School of Engineering, Architecture, and Technology",
"Civic Leadership Academy",
"Clara Barton High School",
"Coalition School for Social Change",
"Cobble Hill School of American Studies",
"Collegiate Institute for Math and Science",
"Columbia Secondary School",
"Community Health Academy of the Heights",
"Community School for Social Justice",
"Crotona International High School",
"CSI High School for International Studies",
"Cultural Academy for the Arts and Sciences",
"Curtis High School",
"Cypress Hills Collegiate Preparatory School",
"DeWitt Clinton High School",
"Discovery High School",
"Dr. Susan S. McKinney Secondary School of the Arts",
"DreamYard Preparatory School",
"Eagle Academy for Young Men",
"Eagle Academy for Young Men II",
"East Bronx Academy for the Future",
"East New York Family Academy",
"East Side Community School",
"East-West School of International Studies",
"EBC High School for Public Service–Bushwick",
"Edward R. Murrow High School",
"El Puente Academy for Peace and Justice",
"Eleanor Roosevelt High School",
"Essex Street Academy",
"Excelsior Preparatory High School",
"Eximius College Preparatory Academy: A College Board School",
"Expeditionary Learning School for Community Leaders",
"Explorations Academy",
"Facing History School, The",
"Fannie Lou Hamer Freedom High School",
"FDNY High School for Fire and Life Safety",
"Felisa Rincon de Gautier Institute for Law and Public Policy, The",
"Fiorello H. LaGuardia High School of Music & Art and Performing Arts",
"Flushing High School",
"Flushing International High School",
"Food and Finance High School",
"Fordham High School for the Arts",
"Fordham Leadership Academy for Business and Technology",
"Foreign Language Academy of Global Studies",
"Forest Hills High School",
"Fort Hamilton High School",
"Foundations Academy",
"Frances Perkins Academy",
"Francis Lewis High School",
"Frank McCourt High School",
"Franklin Delano Roosevelt High School",
"Frederick Douglass Academy",
"Frederick Douglass Academy II Secondary School",
"Frederick Douglass Academy III Secondary School",
"Frederick Douglass Academy IV Secondary School",
"Frederick Douglass Academy VI High School",
"Frederick Douglass Academy VII High School",
"Freedom Academy High School",
"Gateway School for Environmental Research and Technology",
"Gaynor McCown Expeditionary Learning School",
"George Washington Carver High School for the Sciences",
"George Westinghouse Career and Technical Education High School",
"Gotham Professional Arts Academy",
"Grace Dodge Career and Technical Education High School",
"Gramercy Arts High School",
"Green School: An Academy for Environmental Careers",
"Gregorio Luperon High School for Science and Mathematics",
"Grover Cleveland High School",
"Harry S Truman High School",
"Health Opportunities High School",
"Henry Street School for International Studies",
"Herbert H. Lehman High School.",
"Heritage School, The",
"High School for Arts and Business",
"High School for Arts, Imagination and Inquiry",
"High School for Civil Rights",
"High School for Community Leadership",
"High School for Construction Trades, Engineering and Architecture",
"High School for Contemporary Arts",
"High School for Dual Language and Asian Studies",
"High School for Environmental Studies",
"High School for Excellence and Innovation",
"High School for Health Careers and Sciences",
"High School for Health Professions and Human Services",
"High School for Innovation in Advertising and Media",
"High School for Language and Innovation",
"High School for Law and Public Service",
"High School for Law Enforcement and Public Safety",
"High School for Law, Advocacy and Community Justice",
"High School for Mathematics, Science and Engineering at City College",
"High School for Media and Communications",
"High School for Medical Professions",
"High School for Public Service: Heroes of Tomorrow",
"High School for Service & Learning at Erasmus",
"High School for Teaching and the Professions",
"High School for Violin and Dance",
"High School for Youth and Community Development at Erasmus",
"High School of Telecommunication Arts and Technology",
"High School of American Studies at Lehman College",
"High School of Applied Communication",
"High School of Arts and Technology",
"High School of Computers and Technology",
"High School of Economics and Finance",
"High School of Graphic Communication Arts",
"High School of Hospitality Management",
"High School of Sports Management",
"Hillcrest High School",
"Hillside Arts & Letters Academy",
"Holcombe L. Rucker School of Community Research",
"Hostos-Lincoln Academy of Science",
"Hudson High School of Learning Technologies",
"Humanities & Arts Magnet High School",
"Humanities Preparatory Academy",
"Information Technology High School",
"Institute for Collaborative Education",
"In-Tech Academy (M.S. / High School 368)",
"International Arts Business School",
"International Community High School",
"International High School at Lafayette",
"International High School at LaGuardia Community College",
"International High School at Prospect Heights",
"International High School at Union Square",
"International School for Liberal Arts",
"It Takes a Village Academy",
"Jacqueline Kennedy Onassis High School",
"Jamaica Gateway to the Sciences",
"James Madison High School",
"Jane Addams High School for Academic Careers",
"John Adams High School",
"John Bowne High School",
"John Dewey High School",
"Jonathan Levin High School for Media and Communications",
"Juan Morel Campos Secondary School",
"Khalil Gibran International Academy",
"Kingsborough Early College School",
"Kingsbridge International High School",
"Knowledge and Power Preparatory Academy International High School (Kappa)",
"Kurt Hahn Expeditionary Learning School",
"Landmark High School",
"Law, Government and Community Service High School",
"Leadership and Public Service High School",
"Leadership Institute",
"Legacy School for Integrated Studies",
"Leon M. Goldstein High School for the Sciences",
"Life Academy High School for Film and Music",
"Life Sciences Secondary School",
"Long Island City High School",
"Lower Manhattan Arts Academy",
"Lyons Community School",
"Manhattan / Hunter Science High School",
"Manhattan Academy for Arts & Language",
"Manhattan Bridges High School",
"Manhattan Business Academy",
"Manhattan Center for Science and Mathematics",
"Manhattan International High School",
"Manhattan Theatre Lab High School",
"Manhattan Village Academy",
"Marble Hill High School for International Studies",
"Marta Valle High School",
"Martin Van Buren High School",
"Maspeth High School",
"Mathematics, Science Research and Technology Magnet High School",
"Medgar Evers College Preparatory School",
"Metropolitan Expeditionary Learning School",
"Metropolitan High School, The",
"Middle College High School at LaGuardia Community College",
"Midwood High School",
"Millennium Art Academy",
"Millennium Brooklyn HS",
"Millennium High School",
"Monroe Academy for Visual Arts & Design",
"Morris Academy for Collaborative Studies",
"Mott Hall Bronx High School",
"Mott Hall High School",
"Mott Hall V",
"Mott Haven Village Preparatory High School",
"Multicultural High School",
"Murray Hill Academy",
"Murry Bergtraum High School for Business Careers",
"N.Y.C. Lab School for Collaborative Studies",
"N.Y.C. Museum School",
"New Design High School",
"New Dorp High School",
"New Explorations into Science, Technology and Math High School",
"New Explorers High School",
"New Utrecht High School",
"New World High School",
"Newcomers High School",
"Newtown High School",
"NYC iSchool",
"Pablo Neruda Academy for Architecture and World Studies",
"Pace High School",
"Pan American International High School",
"Pan American International High School at Monroe",
"Park East High School",
"Park Slope Collegiate",
"Pathways College Preparatory School: A College Board School",
"Pathways in Technology Early College High School (P-Tech)",
"Peace and Diversity Academy",
"Pelham Preparatory Academy",
"Performing Arts and Technology High School",
"Port Richmond High School",
"Preparatory Academy for Writers: A College Board School",
"Professional Performing Arts High School",
"Progress High School for Professional Careers",
"Queens Collegiate: A College Board School",
"Queens Gateway to Health Sciences Secondary School",
"Queens High School for Information, Research, and Technology",
"Queens High School for the Sciences at York College",
"Queens High School of Teaching, Liberal Arts and the Sciences",
"Queens Metropolitan High School",
"Queens Preparatory Academy",
"Queens School of Inquiry, The",
"Queens Vocational and Technical High School",
"Quest to Learn",
"Rachel Carson High School for Coastal Studies",
"Ralph R. McKee Career and Technical Education High School",
"Renaissance High School for Musical Theater & Technology",
"Repertory Company High School for Theatre Arts",
"Richard R. Green High School of Teaching",
"Richmond Hill High School",
"Riverdale / Kingsbridge Academy (Middle School / High School 141)",
"Robert F. Kennedy Community High School",
"Robert F. Wagner, Jr. Secondary School for Arts and Technology",
"Robert H. Goddard High School of Communication Arts and Technology",
"Rockaway Collegiate High School",
"Rockaway Park High School for Environmental Sustainability",
"Samuel Gompers Career and Technical Education High School",
"Scholars' Academy",
"School for Democracy and Leadership",
"School for Excellence",
"School for Human Rights, The",
"School for International Studies",
"School for Legal Studies",
"School of the Future High School",
"Science Skills Center High School for Science, Technology and the Creative Arts",
"Science, Technology and Research Early College High School at Erasmus",
"Secondary School for Journalism",
"Secondary School for Law",
"Sheepshead Bay High School",
"South Bronx Preparatory: A College Board School",
"Staten Island Technical High School",
"Stuyvesant High School",
"Sunset Park High School",
"Susan E. Wagner High School",
"Talent Unlimited High School",
"Teachers Preparatory High School",
"The Bronxwood Preparatory Academy",
"The Brooklyn Academy of Global Finance",
"The Brooklyn School for Math and Research",
"The Cinema School",
"The College Academy",
"The Global Learning Collaborative",
"The High School for Enterprise, Business and Technology",
"The High School for Global Citizenship",
"The High School for Language and Diplomacy",
"The High School of Fashion Industries",
"The Marie Curie School for Medicine, Nursing, and Health Professions",
"The Metropolitan Soundview High School",
"The Michael J. Petrides School",
"The School For Classics: An Academy Of Thinkers, Writers and Performers",
"The Urban Assembly Bronx Academy of Letters",
"The Urban Assembly School For Green Careers",
"The Urban Assembly School for Law and Justice",
"Theatre Arts Production Company School",
"Thomas A. Edison Career and Technical Education High School",
"Thurgood Marshall Academy for Learning and Social Change",
"Tottenville High School",
"Townsend Harris High School",
"Transit Tech Career and Technical Education High School",
"Unity Center for Urban Technologies",
"University Heights Secondary School",
"University Neighborhood High School",
"Urban Action Academy",
"Urban Assembly Academy of Government and Law, The",
"Urban Assembly Gateway School for Technology",
"Urban Assembly High School of Music and Art",
"Urban Assembly Institute of Math and Science for Young Women",
"Urban Assembly New York Harbor School",
"Urban Assembly School for Applied Math and Science, The",
"Urban Assembly School for Careers in Sports",
"Urban Assembly School for Criminal Justice",
"Urban Assembly School for Media Studies, The",
"Urban Assembly School for the Performing Arts",
"Urban Assembly School for Wildlife Conservation",
"Urban Assembly School of Business for Young Women, the",
"Urban Assembly School of Design and Construction, The",
"Validus Preparatory Academy: An Expeditionary Learning School",
"Vanguard High School",
"Victory Collegiate High School",
"W. H. Maxwell Career and Technical Education High School",
"Wadleigh Secondary School for the Performing & Visual Arts",
"Washington Heights Expeditionary Learning School",
"Washington Irving High School",
"West Bronx Academy for the Future",
"William Cullen Bryant High School",
"William E. Grady Career and Technical Education High School",
"Williamsburg High School for Architecture and Design",
"Williamsburg Preparatory School",
"Wings Academy",
"Women's Academy of Excellence",
"World Academy for Total Community Health High School",
"World Journalism Preparatory: A College Board School",
"York Early College Academy",
"Young Women's Leadership School",
"Young Women's Leadership School of Brooklyn",
"Young Women's Leadership School, Astoria",
"Young Women's Leadership School, Queens",

"Professional Children's School",
"Frank Sinatra School of the Arts",
"The Pingry School",
"Bergenfield High School"
];

