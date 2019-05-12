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

    if (firebase.auth().currentUser) {
        showLoader();
        
        db.collection("MasterNotes").get().then(function(result) {
            if (result.docs.length > 0) {
                for (var doc of result.docs) {
                    var actions = '<a class="edit" title="Edit" data-toggle="tooltip" targrt="_blank" href="' + getUrl(doc.data()['shortId']) + '"><i class="material-icons">&#xE254;</i></a>' +
                    '<a class="delete" title="Delete" data-toggle="tooltip" data-id="' + doc.id + '"><i class="material-icons">&#xE872;</i></a>';

                    $('.table-wrapper .table tbody').append('<tr><td>' + doc.data()['name'] + '</td><td>' + showUrl(doc.data()['shortId']) + '</td><td>' + actions + '</td></tr>');
                }

                $('[data-toggle="tooltip"]').tooltip();
            } else {
                $('.table-wrapper .table tbody').html('<tr><td colspan="3">No data available</td></tr>');
            }

            hideLoader();
        }).catch(function(error) {
            showMessage('Could not get notes', 'alert-danger');
            hideLoader();
        });
    }
}

function deleteNote(e) {
    var db = firebase.firestore();

    showLoader();

    var id = $(e.target).closest('.delete').attr('data-id');

    db.collection('MasterNotes').doc(id).delete()
        .then(function() {
            $(e.target).closest('tr').remove();

            if ($('.table-wrapper tbody tr').length > 0) {
                $('.table-wrapper tbody tr').html('<tr><td colspan="3">No data available</td></tr>');
            }

            showMessage('Note deleted', 'alert-success');
            hideLoader();
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