function getUrl(shortId) {
    return window.location.href.replace(/admin\.html/, '') + shortId;
}

function showUrl(shortId) {
    return '<a href="' + getUrl(shortId) + '" target="_blank">' + getUrl(shortId); + '</a>';
}

function reloadNotes() {
    var db = firebase.firestore();

    $('.message').addClass('d-none');
    $('.message').html('');
    $('.table-wrapper .table tbody').html('');

    var currentUser = firebase.auth().currentUser;
    if (currentUser) {
        showLoader();

        db.collection("UserProfile").where("email", "==", currentUser.email).get()
        .then(async function(result) {
            if (result.docs[0].data().notes.length > 0) {
                for (var id of result.docs[0].data().notes) {
                    var result = await db.collection("MasterNotes").where("shortId", "==", id).get();
                    if (result.docs.length === 1) {
                        var doc = result.docs[0];

                        var actions = '<a class="edit" title="Edit" data-toggle="tooltip" targrt="_blank" href="' + getUrl(doc.data()['shortId']) + '"><i class="material-icons">&#xE254;</i></a>' +
                        '<a class="delete" title="Delete" data-toggle="tooltip" data-id="' + doc.id + '" data-short-id="' + doc.data()['shortId'] + '"><i class="material-icons">&#xE872;</i></a>';

                        $('.table-wrapper .table tbody').append('<tr><td>' + doc.data()['name'] + '</td><td>' + showUrl(doc.data()['shortId']) + '</td><td>' + actions + '</td></tr>');

                        $('[data-toggle="tooltip"]').tooltip();
                    }
                }
            } else {
                $('.table-wrapper .table tbody').html('<tr><td colspan="3" class="text-center">No data available</td></tr>');
            }

            hideLoader();
        }).catch(function(error) {
            console.log(error);
            showMessage('Could not get notes', 'alert-danger');
            hideLoader();
        });
    }
}

function deleteNote(e) {
    var db = firebase.firestore();

    showLoader();

    var id = $(e.target).closest('.delete').attr('data-id');
    var shortId = $(e.target).closest('.delete').attr('data-short-id');

    db.collection('MasterNotes').doc(id).delete()
        .then(function() {
            $(e.target).closest('tr').remove();

            if ($('.table-wrapper tbody tr').length === 0) {
                $('.table-wrapper tbody').html('<tr><td colspan="3" class="text-center">No data available</td></tr>');
            }

            db.collection('UserProfile').get().then(async function(result) {
                for (var doc of result.docs) {
                    var indexOfNote = result.docs[0].data().notes.indexOf(shortId);
                    if (indexOfNote > -1) {
                        var notes = result.docs[0].data().notes;
                        notes.splice(indexOfNote, 1);

                        await db.collection('UserProfile').doc(result.docs[0].id).update({
                            notes: notes
                        });
                    }
                }

                showMessage('Note deleted', 'alert-success');
                hideLoader();
            });
        })
        .catch(function(error) {
            showError(error);
            hideLoader();
        });
}

jQuery(document).ready(function() {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            $('.nav').hide();
            $('.nav-login').show();
        } else {
            $('.nav').show();
            $('.nav-login').hide();
        }

        reloadNotes();
    });
    
    $('.add-new').on('click', function() {
        var redirectUrl = window.location.href.replace('admin.html', 'index.html');

        window.location.replace(redirectUrl);
    });

    $(document).on('click', '.delete', function(e) {
        deleteNote(e);
    });
});