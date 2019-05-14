function getUrl(shortId) {
    return window.location.href.replace(/admin\.html/, '') + shortId;
}

function showUrl(shortId) {
    return '<a href="' + getUrl(shortId) + '" target="_blank">' + getUrl(shortId); + '</a>';
}

function reloadNotes(currentUser) {
    var db = window.fb.firestore;

    $('.message').addClass('d-none');
    $('.message').html('');
    $('.table-wrapper .table tbody').html('');

    if (currentUser) {
        showLoader();

        db.collection("UserProfile").where("email", "==", currentUser.email).get()
            .then(async function(result) {
                if (result.docs[0].data().notes.length > 0) {
                    for (var id of result.docs[0].data().notes) {
                        var result = await db.collection("MasterNotes").where("shortId", "==", id).get();
                        if (result.docs.length === 1) {
                            var doc = result.docs[0];

                            var actions = '<a class="edit" title="' + window.i18n['en']['edit'] + '" data-toggle="tooltip" targrt="_blank" href="' + getUrl(doc.data()['shortId']) + '"><i class="material-icons">&#xE254;</i></a>' +
                            '<a class="delete" title="' + window.i18n['en']['delete'] + '" data-toggle="tooltip" data-id="' + doc.id + '" data-short-id="' + doc.data()['shortId'] + '"><i class="material-icons">&#xE872;</i></a>';

                            $('.table-wrapper .table tbody').append('<tr><td>' + doc.data()['name'] + '</td><td>' + showUrl(doc.data()['shortId']) + '</td><td>' + actions + '</td></tr>');

                            $('[data-toggle="tooltip"]').tooltip();
                        }
                    }

                    if ($('.table-wrapper tbody tr').length === 0) {
                        // $('.table-wrapper .table tbody').html('<tr><td colspan="3" class="text-center alert-success">No data available</td></tr>');
                        showMessage(window.i18n['en']['no-data-available'], 'alert-success');
                        $('.table-wrapper').addClass('d-none');
                    } else {
                        $('.table-wrapper').removeClass('d-none');
                    }
                } else if ($('.table-wrapper tbody tr').length === 0) {
                    // $('.table-wrapper .table tbody').html('<tr><td colspan="3" class="text-center alert-success">No data available</td></tr>');
                    showMessage(window.i18n['en']['no-data-available'], 'alert-success');
                    $('.table-wrapper').addClass('d-none');
                }

                hideLoader();
            }).catch(function(error) {
                console.log(error);
                showMessage(window.i18n['en']['could-not-get-notes'], 'alert-danger');
                $('.table-wrapper').addClass('d-none');
                hideLoader();
            });
    } else {
        // $('.table-wrapper .table tbody').html('<tr><td colspan="3" class="text-center alert-success">Please login</td></tr>');
        showMessage(window.i18n['en']['please-login'], 'alert-success');
        $('.table-wrapper').addClass('d-none');
    }
}

function deleteNote(e) {
    var db = window.fb.firestore;

    showLoader();

    var id = $(e.target).closest('.delete').attr('data-id');
    var shortId = $(e.target).closest('.delete').attr('data-short-id');

    db.collection('MasterNotes').doc(id).delete()
        .then(function() {
            $(e.target).closest('tr').remove();

            if ($('.table-wrapper tbody tr').length === 0) {
                $('.table-wrapper tbody').html('<tr><td colspan="3" class="text-center alert-success">' + window.i18n['en']['no-data-available'] + '</td></tr>');
            }

            const userId = localStorage.getItem('user_id');

            if (userId) {
                db.collection('UserProfile').doc(userId).get().then(async function(result) {
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

                    showMessage(window.i18n['en']['note-deleted'], 'alert-success');
                    hideLoader();
                });
            }
        })
        .catch(function(error) {
            console.log(error);
            showMessage(error);
            hideLoader();
        });
}

jQuery(document).ready(function() {
    window.fb.auth.onAuthStateChanged(async function (user) {
        if (user) {
            $('.nav').hide();
            $('.nav-login').show();
            localStorage.setItem('user_id', user.id);
        } else {
            $('.nav').show();
            $('.nav-login').hide();
            localStorage.removeItem('user_id');
        }

        reloadNotes(user);
    });
    
    $('.add-new').on('click', function() {
        var redirectUrl = window.location.href.replace('admin.html', 'index.html');

        window.location.replace(redirectUrl);
    });

    $(document).on('click', '.delete', function(e) {
        deleteNote(e);
    });
});