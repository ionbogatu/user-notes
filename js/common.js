function isUserLoggedIn() {
	return localStorage.getItem('is_logged_in') === '1';
}

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    }).catch(function() {
    	
    });
}

function facebookLogin() {
    var provider = new firebase.auth.FacebookAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function (result) {
        createUserIfNotExist();
        $('.nav').toggle();
    }).catch(function() {

    });
}

function logout() {
    firebase.auth().signOut().then(function () {
        $('.nav').show();
        $('.nav-login').hide();
    }, function () {

    });
}

function createUserIfNotExist() {
    var db = firebase.firestore();

    const email = firebase.auth().currentUser.email
    const userProfileCollection = db.collection("UserProfile");
    userProfileCollection.where("email", "==", email).get()
        .then(function (result) {
            if (result.docs.length === 0) {
                userProfileCollection.add({
                    email: email,
                    notes: []
                });
            }
        })
        .catch(function (error) {
            $('.table-wrapper').addClass('d-none');
            $('.error').removeClass('d-none');
            $('.error').html('<p class="alert alert-danger">Could not get the user</p>');
            console.error(error);
        });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function showMessage(message, alertClass) {
	if (alertClass === 'alert-danger') {
	    $('.table-wrapper').addClass('d-none');
	}

    if ($('.table-wrapper-2').length === 1) {
    	$('.table-wrapper-2').closest('.container').addClass('d-none');
    }

    $('.message').removeClass('d-none');
    $('.message').html('<p class="alert ' + alertClass + '">' + message + '</p>');
}

function hasEmptyRows(highlight = false) {
    var empty = false;

    $('.table-wrapper table tbody tr input[type="text"]').each(function() {
        if(!$(this).val()){
            if (highlight) {
                $(this).addClass("error");
            }
            empty = true;
        } else{
            if (highlight) {
                $(this).removeClass("error");
            }
        }
    });

    return empty;
}

function showLoader() {
    $(".loader").addClass('loader--show');
}

function hideLoader() {
    $(".loader").removeClass('loader--show');
}

var firebaseConfig = {
    apiKey: "AIzaSyBOthBwcREmRXm2OwHDoIQqbzdERufUowE",
    authDomain: "user-notes-d5283.firebaseapp.com",
    databaseURL: "https://user-notes-d5283.firebaseio.com",
    projectId: "user-notes-d5283",
    storageBucket: "user-notes-d5283.appspot.com",
    messagingSenderId: "688290206555",
    appId: "1:688290206555:web:5ecc4a6ba1a7c77d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		localStorage.setItem('is_logged_in', '1');
	} else {
		if (localStorage.getItem('is_logged_in')) {
			localStorage.removeItem('is_logged_in');
		}
	}
});