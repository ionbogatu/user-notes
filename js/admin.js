function getUrl(shortId) {
    return window.location.href.replace(/admin\.html/, '') + shortId;
}

function showUrl(shortId) {
    return '<a href="' + getUrl(shortId) + '" target="_blank">' + getUrl(shortId); + '</a>';
}

async function reloadNotes() {
    showLoader();

    var db = window.fb.firestore;

    $('.message').addClass('d-none');
    $('.message').html('');
    $('.table-wrapper .table tbody').html('');

    if (localStorage.getItem('user_id')) {
        var result = await db.collection("MasterNotes").where("userId", "==", localStorage.getItem('user_id')).get();
        if (result.docs.length > 0) {
            for (const doc of result.docs) {
                try {
                    var actions = '<a class="edit" title="' + window.i18n['en']['edit'] + '" data-toggle="tooltip" targrt="_blank" href="' + getUrl(doc.data()['shortId']) + '"><i class="material-icons">&#xE254;</i></a>' +
                    '<a class="delete" title="' + window.i18n['en']['delete'] + '" data-toggle="tooltip" data-id="' + doc.id + '" data-short-id="' + doc.data()['shortId'] + '"><i class="material-icons">&#xE872;</i></a>';

                    $('.table-wrapper .table tbody').append('<tr><td>' + doc.data()['name'] + '</td><td>' + showUrl(doc.data()['shortId']) + '</td><td>' + actions + '</td></tr>');

                    $('[data-toggle="tooltip"]').tooltip();
                    $('.table-wrapper').removeClass('d-none');
                } catch (e) {
                    console.log(e);
                }
            }
        } else {
            showMessage(window.i18n['en']['no-data-available'], 'alert-success');
            $('.table-wrapper').addClass('d-none');
        }
    } else {
        // $('.table-wrapper .table tbody').html('<tr><td colspan="3" class="text-center alert-success">Please login</td></tr>');
        showMessage(window.i18n['en']['please-login'], 'alert-success');
        $('.table-wrapper').addClass('d-none');
    }

    hideLoader();
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
                $('.table-wrapper').addClass('d-none');
                showMessage(window.i18n['en']['no-data-available'], 'alert-success');
            }

            hideLoader();
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

            await window.fb.firestore.collection("UserProfile").where('email', '==', window.fb.auth.currentUser.email).get()
                .then(function(result) {
                    if (result.docs.length === 1) {
                        localStorage.setItem('user_id', result.docs[0].id);
                    }
                }).catch(function(error) {
                    console.log(error);
                });
        } else {
            localStorage.removeItem('user_id');

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